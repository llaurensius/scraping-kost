import asyncio
import io
import os
from typing import List, Optional

from fastapi import FastAPI, BackgroundTasks, Query, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.services.har_parser import HARParser
from backend.services.geo_service import GeoService
from backend.services.scoring_service import ScoringService
from backend.services.db_service import DBService
from backend.services.scraping_engine import ScrapingEngine
from backend.services.export_service import ExportService

app = FastAPI(
    title="Mamikos Scraping & Location Intelligence API",
    version="1.1.0",
    description="Backend API untuk ekstraksi data Mamikos, dynamic geocoding rute OSRM, VFM scoring, dan streaming log."
)

# Enable CORS for decoupled React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inisialisasi Service Instances
har_parser = HARParser()
geo_service = GeoService()
db_service = DBService()
scraping_engine = ScrapingEngine(
    har_parser=har_parser,
    geo_service=geo_service,
    db_service=db_service
)


# --- Request & Response Models ---

class DiscoveryRequest(BaseModel):
    gender: Optional[str] = "all"
    genders: Optional[List[int]] = Field(default=None, description="Array gender Mamikos: 0 (Campur), 1 (Putra), 2 (Putri)")
    price_min: int = Field(default=500000, ge=0)
    price_max: int = Field(default=5000000, ge=0)
    target_count: int = Field(default=40, ge=1, le=500)
    geocode_id: str = Field(default="100", description="Kode area Mamikos (100: Jakarta Selatan)")
    tag_ids: Optional[List[int]] = Field(default_factory=list, description="Array tag fasilitas server Mamikos")
    weight_price: float = Field(default=0.60, ge=0.0, le=1.0)
    weight_distance: float = Field(default=0.40, ge=0.0, le=1.0)


class EnrichRequest(BaseModel):
    kost_ids: List[str] = Field(description="Array ID kost yang akan diperkaya")


class SessionUpdateRequest(BaseModel):
    api_key: Optional[str] = None
    user_agent: Optional[str] = None
    xsrf_token: Optional[str] = None
    aes_key: Optional[str] = None
    aes_iv: Optional[str] = None



class CustomExportRequest(BaseModel):
    kost_ids: Optional[List[str]] = Field(default=None, description="Array ID kost yang difilter")
    sort_by: Optional[str] = "vfm_score"
    sort_order: Optional[str] = "desc"

class TargetLocationUpdateRequest(BaseModel):
    target_input: str = Field(description="URL Google Maps shortlink/long atau koordinat 'lat, lng'")
    recalculate: bool = Field(default=True, description="Hitung ulang rute seluruh kost di database")


# --- API Routes ---

@app.get("/api/session/status")
def get_session_status():
    """Health check token, headers, koneksi Mamikos, dan kemampuan dekripsi."""
    return har_parser.test_session_health()


@app.post("/api/session/update")
def update_session(req: SessionUpdateRequest):
    """Memperbarui parameter session dan menyimpannya ke session_config.json."""
    cfg = har_parser.config
    if req.api_key:
        cfg["api_keys"] = [req.api_key]
    if req.user_agent:
        cfg["user_agents"] = [req.user_agent]
    if req.xsrf_token:
        cfg["xsrf_tokens"] = [req.xsrf_token]
    if req.aes_key:
        cfg.setdefault("aes_cipher", {})["key"] = req.aes_key
    if req.aes_iv:
        cfg.setdefault("aes_cipher", {})["iv"] = req.aes_iv

    har_parser.save_config(cfg)
    return {"status": "success", "message": "Konfigurasi session berhasil diperbarui."}


@app.get("/api/target-location")
def get_target_location(url: Optional[str] = None):
    """Mengambil informasi geocoding lokasi tujuan aktif."""
    return geo_service.resolve_target_location(url)


@app.post("/api/target-location")
def set_target_location(req: TargetLocationUpdateRequest):
    """Memperbarui lokasi target tujuan dan opsional menghitung ulang seluruh rute kost."""
    resolved = geo_service.resolve_target_location(req.target_input)
    recalculated_count = 0
    if req.recalculate:
        recalculated_count = geo_service.recalculate_all_kost_routes(
            target_lat=resolved["latitude"],
            target_lng=resolved["longitude"]
        )
        db_service.recalculate_all_vfm()

    return {
        "status": "success",
        "target_location": resolved,
        "recalculated_count": recalculated_count,
        "message": f"Lokasi target diperbarui ke {resolved['name']}. {recalculated_count} rute kost dihitung ulang."
    }


@app.post("/api/routes/recalculate")
def recalculate_routes():
    """Menghitung ulang rute OSRM & VFM semua kost terhadap target aktif."""
    target = geo_service.resolve_target_location()
    count = geo_service.recalculate_all_kost_routes(target["latitude"], target["longitude"])
    db_service.recalculate_all_vfm()
    return {"status": "success", "recalculated_count": count}


@app.post("/api/scrape/discovery")
async def start_discovery(req: DiscoveryRequest, background_tasks: BackgroundTasks):
    """Memicu Phase 1 Fast Discovery di background task."""
    if scraping_engine.is_running:
        return JSONResponse(
            status_code=409,
            content={"status": "error", "message": "Proses scraping sedang berlangsung."}
        )

    background_tasks.add_task(
        scraping_engine.run_discovery,
        gender=req.gender,
        genders=req.genders,
        price_min=req.price_min,
        price_max=req.price_max,
        target_count=req.target_count,
        geocode_id=req.geocode_id,
        tag_ids=req.tag_ids,
        weight_price=req.weight_price,
        weight_distance=req.weight_distance,
    )
    return {"status": "started", "message": "Fast Discovery engine dijalankan di background."}


@app.post("/api/scrape/enrich")
async def start_enrich(req: EnrichRequest, background_tasks: BackgroundTasks):
    """Memicu Phase 2 Deep Enrichment untuk ID kost terpilih."""
    if not req.kost_ids:
        return JSONResponse(status_code=400, content={"status": "error", "message": "ID kost tidak boleh kosong."})

    background_tasks.add_task(scraping_engine.run_enrichment, kost_ids=req.kost_ids)
    return {"status": "started", "message": f"Deep Enrichment dijadwalkan untuk {len(req.kost_ids)} kost."}


@app.get("/api/scrape/progress")
async def stream_progress():
    """Server-Sent Events (SSE) streaming real-time log ke frontend."""
    return StreamingResponse(
        scraping_engine.subscribe_progress(),
        media_type="text/event-stream"
    )


@app.get("/api/kost")
def get_kost_list(
    response: Response,
    gender: Optional[str] = Query(default=None),
    genders: Optional[List[str]] = Query(default=None),
    min_price: Optional[int] = Query(default=None),
    max_price: Optional[int] = Query(default=None),
    sort_by: str = Query(default="vfm_score", regex="^(vfm_score|price|distance|name)$"),
    sort_order: str = Query(default="desc", regex="^(asc|desc)$"),
    limit: int = Query(default=1000, ge=1, le=10000),
    offset: int = Query(default=0, ge=0),
):
    """Mengambil daftar kost tersimpan dengan filter dan pengurutan."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    items = db_service.get_kost_listings(
        gender=gender,
        genders=genders,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset
    )
    total = db_service.count_kost_listings()
    return {
        "total": total,
        "count": len(items),
        "items": items
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/export/excel")
def export_excel(
    gender: Optional[str] = Query(default=None),
    min_price: Optional[int] = Query(default=None),
    max_price: Optional[int] = Query(default=None),
    sort_by: str = Query(default="vfm_score"),
    sort_order: str = Query(default="desc")
):
    """Download Excel spreadsheet (.xlsx) dengan conditional formatting & clickable hyperlink."""
    items = db_service.get_kost_listings(
        gender=gender,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=5000,
        offset=0
    )
    excel_bytes = ExportService.generate_excel(items)
    filename = "kost_intelligence_data.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(io.BytesIO(excel_bytes), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)


@app.get("/api/export/csv")
def export_csv(
    gender: Optional[str] = Query(default=None),
    min_price: Optional[int] = Query(default=None),
    max_price: Optional[int] = Query(default=None),
    sort_by: str = Query(default="vfm_score"),
    sort_order: str = Query(default="desc")
):
    """Download CSV file siap olah."""
    items = db_service.get_kost_listings(
        gender=gender,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=5000,
        offset=0
    )
    csv_bytes = ExportService.generate_csv(items)
    filename = "kost_intelligence_data.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(io.BytesIO(csv_bytes), media_type="text/csv", headers=headers)



@app.post("/api/export/custom-excel")
def export_custom_excel(req: CustomExportRequest):
    """Download Excel spreadsheet (.xlsx) untuk ID kost yang difilter di Excel Explorer."""
    if req.kost_ids is not None:
        items = db_service.get_kost_by_ids(req.kost_ids)
    else:
        items = db_service.get_kost_listings(limit=10000)

    def sort_key(item):
        if req.sort_by == "price":
            return item.get("price_monthly") or 0
        if req.sort_by == "distance":
            return item.get("motorcycle_distance_km") or 999
        if req.sort_by == "name":
            return (item.get("name") or "").lower()
        return item.get("vfm_score") or 0

    items.sort(key=sort_key, reverse=(req.sort_order.lower() == "desc"))

    excel_bytes = ExportService.generate_excel(items)
    filename = "kost_explorer_filtered.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(io.BytesIO(excel_bytes), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)


@app.post("/api/export/custom-csv")
def export_custom_csv(req: CustomExportRequest):
    """Download CSV untuk ID kost yang difilter di Excel Explorer."""
    if req.kost_ids is not None:
        items = db_service.get_kost_by_ids(req.kost_ids)
    else:
        items = db_service.get_kost_listings(limit=10000)

    def sort_key(item):
        if req.sort_by == "price":
            return item.get("price_monthly") or 0
        if req.sort_by == "distance":
            return item.get("motorcycle_distance_km") or 999
        if req.sort_by == "name":
            return (item.get("name") or "").lower()
        return item.get("vfm_score") or 0

    items.sort(key=sort_key, reverse=(req.sort_order.lower() == "desc"))

    csv_bytes = ExportService.generate_csv(items)
    filename = "kost_explorer_filtered.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(io.BytesIO(csv_bytes), media_type="text/csv", headers=headers)


@app.delete("/api/kost/clear")
def clear_kost_database():
    """Menghapus seluruh data kost dari database lokal."""
    count = db_service.clear_all_listings()
    return {"status": "success", "deleted_count": count}

# Mount built frontend static files if available
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
