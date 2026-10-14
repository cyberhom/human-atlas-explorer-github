from __future__ import annotations

import os
import re
from typing import Any, Iterator
from urllib.parse import urljoin

import requests
from flask import Flask, Response, jsonify, redirect, request, stream_with_context
from flask_cors import CORS

app = Flask(__name__)
# FRONTEND_ORIGIN accepts one or several comma-separated origins, e.g.
# http://localhost:3000,https://your-app.vercel.app
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
    if origin.strip()
]
CORS(app, resources={r"/api/*": {"origins": _allowed_origins}})

API_BASE = "https://api.brain-map.org"
QUERY_URL = f"{API_BASE}/api/v2/data/query.json"
FILE_URL_BASE = f"{API_BASE}/api/v2/well_known_file_download/"
TIMEOUT = 35

MODALITIES = {
    "T1-MRI": "T1-MRI",
    "T2-MRI": "T2-MRI",
    "DTI-MRI": "DTI-MRI",
    "ALL": None,
}


def _api_get(url: str, **kwargs: Any) -> requests.Response:
    response = requests.get(url, timeout=TIMEOUT, headers={"User-Agent": "HumanBrainAtlasExplorer/1.0"}, **kwargs)
    response.raise_for_status()
    return response


def _walk(value: Any) -> Iterator[dict[str, Any]]:
    """Yield every dictionary nested in a JSON API response."""
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def _get_type(file_record: dict[str, Any]) -> str:
    node = file_record.get("well_known_file_type") or file_record.get("well-known-file-type") or {}
    if isinstance(node, dict):
        return str(node.get("name") or node.get("description") or "Unknown MRI")
    return str(node or "Unknown MRI")


def _extract_records(payload: dict[str, Any], selected_modality: str) -> list[dict[str, Any]]:
    """Flatten nested Donor -> Specimen -> WellKnownFile API results for the UI."""
    root = payload.get("msg", payload.get("data", payload))
    records: dict[tuple[str, str], dict[str, Any]] = {}

    # Preferred path: the documented query returns donors with nested specimens and files.
    donor_nodes: list[dict[str, Any]] = []
    for node in _walk(root):
        specimens = node.get("specimens")
        if isinstance(specimens, list) and node.get("name") and any(
            isinstance(s, dict) and ("well_known_files" in s or "well-known-files" in s)
            for s in specimens
        ):
            donor_nodes.append(node)
    # Avoid revisiting the same donor object if nested structures repeat it.
    seen_ids: set[int] = set()
    for donor in donor_nodes:
        if id(donor) in seen_ids:
            continue
        seen_ids.add(id(donor))
        donor_name = str(donor.get("name") or "Unknown donor")
        product = donor.get("products") or donor.get("product") or []
        product_names: list[str] = []
        if isinstance(product, dict):
            product_names = [str(product.get("name", ""))]
        elif isinstance(product, list):
            product_names = [str(p.get("name", "")) for p in product if isinstance(p, dict)]
        for specimen in donor.get("specimens", []):
            if not isinstance(specimen, dict):
                continue
            files = specimen.get("well_known_files") or specimen.get("well-known-files") or []
            if isinstance(files, dict):
                files = [files]
            for file_record in files:
                if not isinstance(file_record, dict):
                    continue
                type_name = _get_type(file_record)
                # The upstream criteria already restrict this request to the chosen type;
                # some RMA responses omit the nested type name when only= is used.
                if type_name == "Unknown MRI" and selected_modality != "ALL":
                    type_name = selected_modality
                if selected_modality != "ALL" and type_name != selected_modality:
                    continue
                link = file_record.get("download_link") or file_record.get("download-link")
                file_id = str(file_record.get("id") or "")
                if not file_id and link:
                    match = re.search(r"well_known_file_download/(\d+)", str(link))
                    if match:
                        file_id = match.group(1)
                if not file_id and link:
                    file_id = str(link).rstrip("/").split("/")[-1]
                if not file_id.isdigit():
                    continue
                key = (file_id, type_name)
                records[key] = {
                    "id": file_id,
                    "donor": donor_name,
                    "specimen_id": specimen.get("id"),
                    "modality": type_name,
                    "product": ", ".join(n for n in product_names if n),
                    "download_url": f"/api/mri/files/{file_id}/download",
                }

    # Fallback for variations in the API's nested JSON representation.
    if not records:
        for node in _walk(root):
            link = node.get("download_link") or node.get("download-link")
            if not link:
                continue
            match = re.search(r"well_known_file_download/(\d+)", str(link))
            file_id = str(node.get("id") or (match.group(1) if match else ""))
            if not file_id.isdigit():
                continue
            type_name = _get_type(node)
            if type_name == "Unknown MRI" and selected_modality != "ALL":
                type_name = selected_modality
            if selected_modality != "ALL" and type_name != selected_modality:
                continue
            records[(file_id, type_name)] = {
                "id": file_id,
                "donor": "Donor metadata unavailable",
                "specimen_id": None,
                "modality": type_name,
                "product": "",
                "download_url": f"/api/mri/files/{file_id}/download",
            }
    return sorted(records.values(), key=lambda r: (r["donor"], r["modality"], r["id"]))


def _build_criteria(donor: str | None, modality: str) -> str:
    products = "products[abbreviation$in'HumanMA','HumanSZ','HumanCtx','HumanSubCtx']"
    organism = "organism[name$il'Homo Sapiens']"
    if donor:
        # Restrict input to safe donor-ID characters before embedding in RMA criteria syntax.
        if not re.fullmatch(r"[A-Za-z0-9._-]{1,48}", donor):
            raise ValueError("شناسهٔ اهداکننده فقط می‌تواند شامل حروف، عدد، نقطه، خط تیره و زیرخط باشد.")
        criteria = f"model::Donor,rma::criteria,[name$il'{donor}'],{products},{organism}"
    else:
        criteria = f"model::Donor,rma::criteria,{products},{organism}"
    if modality == "ALL":
        type_filter = "well_known_file_type[name$in'T1-MRI','T2-MRI','DTI-MRI']"
    else:
        type_filter = f"well_known_file_type[name$eq'{modality}']"
    criteria += (
        ",rma::include,specimens(well_known_files(" + type_filter + "))"
        ",rma::options[only$eq'donors.name,products.name,well_known_files.id,well_known_files.download_link,well_known_files.well_known_file_type.name,specimens.id']"
    )
    return criteria


@app.get("/api/health")
def health() -> Response:
    return jsonify({"status": "ok", "service": "Human Brain Atlas Explorer API", "upstream": API_BASE})


@app.get("/api/mri")
def list_mri() -> tuple[Response, int] | Response:
    donor = request.args.get("donor", "").strip() or None
    modality = request.args.get("modality", "T1-MRI").upper()
    # Keep accepted modality values explicit; no arbitrary RMA query is exposed to clients.
    normalized = {"T1": "T1-MRI", "T1-MRI": "T1-MRI", "T2": "T2-MRI", "T2-MRI": "T2-MRI",
                  "DTI": "DTI-MRI", "DTI-MRI": "DTI-MRI", "ALL": "ALL"}.get(modality)
    if not normalized:
        return jsonify({"error": "modality باید یکی از T1-MRI، T2-MRI، DTI-MRI یا ALL باشد."}), 400
    try:
        limit = max(1, min(int(request.args.get("limit", "50")), 100))
    except ValueError:
        return jsonify({"error": "limit باید عدد صحیح باشد."}), 400

    try:
        criteria = _build_criteria(donor, normalized)
        upstream = _api_get(QUERY_URL, params={"criteria": criteria, "num_rows": limit, "start_row": 0})
        payload = upstream.json()
        if isinstance(payload, dict) and payload.get("success") is False:
            return jsonify({"error": "Allen Brain Map API درخواست را ناموفق اعلام کرد.", "details": payload.get("msg")}), 502
        records = _extract_records(payload, normalized)[:limit]
        return jsonify({
            "source": "Allen Institute for Brain Science — Allen Human Brain Atlas",
            "method": "GET",
            "query_endpoint": QUERY_URL,
            "count": len(records),
            "items": records,
            "note": "وجود و نوع فایل‌ها به داده‌های موجود در API بستگی دارد. دانلود فایل لزوماً به معنی تصویر آمادهٔ نمایش در مرورگر نیست.",
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except requests.RequestException as exc:
        app.logger.exception("Allen Brain Map API request failed")
        return jsonify({"error": "ارتباط با Allen Brain Map API برقرار نشد.", "details": str(exc)}), 502
    except (ValueError, TypeError) as exc:
        app.logger.exception("Invalid JSON returned by Allen Brain Map API")
        return jsonify({"error": "پاسخ API قابل پردازش نبود.", "details": str(exc)}), 502


@app.get("/api/mri/files/<file_id>/download")
def download_mri(file_id: str) -> Response:
    if not file_id.isdigit():
        return jsonify({"error": "شناسهٔ فایل نامعتبر است."}), 400
    # Redirect to the documented WellKnownFile download service.
    return redirect(f"{FILE_URL_BASE}{file_id}", code=302)


@app.get("/api/mri/files/<file_id>/volume")
def proxy_mri_volume(file_id: str) -> tuple[Response, int] | Response:
    """Stream a file for the optional browser preview; the client checks if it is NIfTI."""
    if not file_id.isdigit():
        return jsonify({"error": "شناسهٔ فایل نامعتبر است."}), 400
    url = f"{FILE_URL_BASE}{file_id}"
    try:
        upstream = requests.get(url, stream=True, timeout=TIMEOUT, headers={"User-Agent": "HumanBrainAtlasExplorer/1.0"})
        upstream.raise_for_status()
    except requests.RequestException as exc:
        app.logger.exception("MRI download proxy failed")
        return jsonify({"error": "فایل MRI از سرویس رسمی دریافت نشد.", "details": str(exc)}), 502

    def generate() -> Iterator[bytes]:
        try:
            for chunk in upstream.iter_content(chunk_size=1024 * 256):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    headers = {}
    for header in ("Content-Type", "Content-Disposition", "Content-Length"):
        if header in upstream.headers:
            headers[header] = upstream.headers[header]
    headers["Cache-Control"] = "no-store"
    return Response(stream_with_context(generate()), headers=headers, content_type=upstream.headers.get("Content-Type", "application/octet-stream"))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "0") == "1")
