# Third-party data notices

## NASA Blue Marble: Next Generation

`public/textures/blue-marble-4k.jpg` is a 4096 × 2048 derivative of the
March Blue Marble: Next Generation global image published by the NASA Goddard
Space Flight Center Scientific Visualization Studio.

- Source: https://svs.gsfc.nasa.gov/3615/
- Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio
- Blue Marble Next Generation imagery: Reto Stöckli (NASA/GSFC) and NASA Earth
  Observatory

The image is used as geographic context for this research demonstration. It does
not contain the CEMS evidence or authored scenario overlays rendered above it.

## Copernicus Emergency Management Service

`lib/historic-evidence.ts` contains small coordinate derivatives from public CEMS
vector packages. Polygon exteriors were sampled at equal distances; representative
points, Evros active-flame coordinates, and compact fire-front samples retain their
source longitude/latitude values.

- EMSR686 Monitoring 08:
  https://rapidmapping.emergency.copernicus.eu/backend/EMSR686/AOI01/DEL_MONIT08/EMSR686_AOI01_DEL_MONIT08_v1.zip
- EMSR686 Monitoring 02:
  https://rapidmapping.emergency.copernicus.eu/backend/EMSR686/AOI01/DEL_MONIT02/EMSR686_AOI01_DEL_MONIT02_v3.zip
- EMSR715 AOI01 delineation:
  https://rapidmapping.emergency.copernicus.eu/backend/EMSR715/AOI01/DEL_PRODUCT/EMSR715_AOI01_DEL_PRODUCT_v2.zip
- EMSR500 Monitoring 01:
  https://cems-mapping-website.s3.eu-west-1.amazonaws.com/static/activations/EMSR500/EMSR500_AOI01_DEL_MONIT01_r1_RTP01_v1_vector.zip
- Credit: European Union, Copernicus Emergency Management Service
- Policy: https://mapping.emergency.copernicus.eu/about/terms-and-conditions/

The app magnifies these local shapes for full-Earth legibility and is not an
authoritative reproduction of a response map.

## NASA POWER / MERRA-2

`lib/historic-evidence.ts` also stores daily point values returned by the official
NASA POWER Daily API for each case: 2 m temperature (`T2M`), 10 m wind speed
(`WS10M`), 10 m meteorological-from wind direction (`WD10M`), and surface soil
wetness (`GWETTOP`).

- API documentation:
  https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Methodology:
  https://power.larc.nasa.gov/docs/methodology/meteorology/wind/
- Credit: NASA Prediction Of Worldwide Energy Resources (POWER), with MERRA-2
  source data

The values are daily gridded reanalysis context, not local station measurements.
Authored forecasts, normalized context dots, and asset fixtures are not CEMS or NASA
products.
