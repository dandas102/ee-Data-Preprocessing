import ee
import geetools
ee.Initialize()


# Define an ImageCollection
studyExtent = ee.FeatureCollection("users/dandas/BoundVectors/testBound1");
Sent2AB_asset = ee.ImageCollection("users/dandas/agrLandSeg/sent2AB_ImgCollec");
Sent1C_asset = ee.ImageCollection("users/dandas/agrLandSeg/sent1C_ImgCollec");

# Set parameters
scale = 10
folder1 = 'Sent2AB_New'
folder2 = 'Sent1C_New'
data_type = 'double'
region = studyExtent

# Create tasks for export
tasks1 = geetools.batch.Export.imagecollection.toDrive(
    collection=Sent2AB_asset,
    folder=folder1,
    region=studyExtent,
    scale=scale,
    dataType=data_type,
    verbose=True,
    maxPixels=int(1e13)
)

tasks2 = geetools.batch.Export.imagecollection.toDrive(
    collection=Sent1C_asset,
    folder=folder2,
    region=studyExtent,
    scale=scale,
    dataType=data_type,
    verbose=True,
    maxPixels=int(1e13)
)
