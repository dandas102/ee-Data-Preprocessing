# ee-Data-Preprocessing
An earth-engine javascript code for pre-processing Sentinel-1C (SAR) and Sentinel-2A/B satellite imagery (Can be customized for other satellite imagery types). Additional python script is added to export preprocessed images to Google Drive. Visiualization of statistical information is included.

This is part of agricultural parcel delineation project partly implemented in Google Earth Engine computing environment. The Google Earth Engine implementation can be found at: https://code.earthengine.google.com/?accept_repo=users/dandas/AgricParcels or git clone: https://earthengine.googlesource.com/users/dandas/AgricParcels

# Steps:
1. Run pre-process-datasets.js preferably in a Google Earth Engine environment using link: 
2. Run export2drive.py in your python Earthengine environment inorder to export pre-processed imagery to your Google drive
  a) Setup you Earth Engine python API environment. For guidance, see: https://developers.google.com/earth-engine/guides/python_install
  b) Install the geemap PyPI package. Steps to follow: https://pypi.org/project/geemap/
  
# Samples
1. Annual NDVI Profiles
![alt text](https://github.com/dandas102/ee-Data-Preprocessing/blob/master/outputs/ee-chart-NDVI.png?raw=true)

2. Annual ARVI Profiles
![alt text](https://github.com/dandas102/ee-Data-Preprocessing/blob/master/outputs/ee-chart-ARVI.png?raw=true)

3. Annual VV/VH log Ratio Profiles
![alt text](https://github.com/dandas102/ee-Data-Preprocessing/blob/master/outputs/ee-chart-logR.png?raw=true)

# Entending and re-use in your projects
This is governed under GNU Puplic licence, once adopted/adapted to you project, you should credit the developer as:
Abudu, D. (2020). An Earth Engine Tool for Pre-Processing Sentinel-1C (SAR) and Sentinel-2A/B satellite imagery. Available [Online]: https://code.earthengine.google.com/?accept_repo=users/dandas/AgricParcels

