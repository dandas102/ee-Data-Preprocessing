//Google Earth Engine Repository (filename: StudyData): code.earthengine.google.com/?accept_repo=users/gorelick/examples

//Link to source datasets
var sentinel1SAR = ee.ImageCollection("COPERNICUS/S1_GRD"),
    sentinel2AB = ee.ImageCollection("COPERNICUS/S2_SR"),
    studyArea = ee.FeatureCollection("users/dandas/BoundVectors/UGA_adm0"),
    studyExtent = ee.FeatureCollection("users/dandas/BoundVectors/testBound1");

// import existing tools
var lee = require('users/dandas/AgricParcels:tools/RefinedLeeFilter');
var batchExport = require('users/fitoprincipe/geetools:batch');

//filter to study area and center map to a zoom level
Map.addLayer(studyExtent, null, "Study Area");
Map.centerObject(studyExtent, 8);

//satellite imagery filtered to parameters of interest (10m)
var bands = ["B2","B3","B4","B8"];
var sent2AB = sentinel2AB.filterBounds(studyExtent)
  .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE',20)).select(bands);
var sent1C = sentinel1SAR.filterBounds(studyExtent)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('instrumentMode', 'IW')); 

//get dates to work with, following SAR 12-day composite 
var dates = sent2AB.map(function(image) {
      return ee.Feature(null, {'date': image.date()});
    }).distinct('date').aggregate_array('date');
var startDate = ee.Date(ee.List(dates).get(0));
var endDate = ee.Date(ee.List(dates).get(-1));
var interval = 12; 
var nDays = ee.Number(endDate.difference(startDate,'day')).round(); // Total No of Days with imagery
var nDaysInterval = endDate.difference(startDate,'day').divide(interval).toInt(); //range of image collection

//filter image collection according to composite date range
sent2AB = sent2AB.filterDate(startDate, endDate);
sent1C = sent1C.filterDate(startDate, endDate);
print("SENT2 A/B Entire Collection", sent2AB);
print("SENT 1C (SAR) Entire Collection", sent1C);


/////////////////////////////////////////////////////////////////////////////////////
// BEGIN WORK ON THE SENTINEL 2 IMAGERY


// calculate vegetation indices & append to the bands
var calcNDVI = function(image){
    return image.addBands(image.select('B8').subtract(image.select('B4'))
            .divide(image.select('B8').add(image.select('B4'))).rename('NDVI'));
};

var calcARVI = function(image){
    return image.addBands(((image.select('B8').subtract(image.select('B4')).subtract((image.select('B2').subtract(image.select('B4'))).multiply(1)))
            .divide(image.select('B8').add(image.select('B4')).subtract((image.select('B2').subtract(image.select('B4'))).multiply(1)))).rename('ARVI'));
};

var sent2AB_VIs = sent2AB.map(calcNDVI);    
sent2AB_VIs = sent2AB_VIs.map(calcARVI); 


//sequence to hold each 12-day composite - start and end dates inclusive
var imgRange = ee.List.sequence(0, nDaysInterval); 

//map over the date sequence above
var sent2AB_Compositing = imgRange.map(function(num){
  num = ee.Number(num);
  var windowStart = startDate.advance(num.multiply(interval), 'day');
  var windowEnd = startDate.advance(num.add(1).multiply(interval), 'day');
  var composite = sent2AB_VIs.filterDate(windowStart, windowEnd);
  //return composite.reduce(ee.Reducer.mean()).clip(studyExtent).set('system:time_start', windowStart);
  return composite.qualityMosaic('NDVI').clip(studyExtent).set('system:time_start', windowStart);
  });
//convert composite images to imagecollection 
var sent2AB_Composit1 = ee.ImageCollection.fromImages(sent2AB_Compositing);
print("Initial List of Sentinel-2A/B 12-Day Composites", sent2AB_Composit1);


// Generate images without NDVI and ARVI bands (for export purposes) and 
// remove null images (images without bands)

var sent2AB_Composites = sent2AB_Compositing
    .map(function(item) {
      var pureBandImages = ee.Image(item).select(ee.Image(item).bandNames().filter(ee.Filter.stringEndsWith('item', 'VI').not()));
      return pureBandImages.set('count', ee.Image(item).bandNames().length());
    })
    .filter(ee.Filter.neq('count', 0));
    

//convert composite images to imagecollection 
sent2AB_Composites = ee.ImageCollection.fromImages(sent2AB_Composites);
print("Filtered List of Sentinel-2A/B 12-Day Composites", sent2AB_Composites);


///////////////////////////////////////////////////////////////////////////////////////////
//// WORK ON SENTINEL - 1C (SAR) IMAGERY //////

//functions to apply angle correction to VH and VV - normalisation
function gammaNoughtRefVH(image) {
 var numerator1 = image.select('VH').multiply(37.55).divide(180).multiply(Math.PI);
 var numerator2 = numerator1.cos().pow(2);
 var denominator1 = image.select('angle').divide(180.00).multiply(Math.PI);
 var denominator2 = denominator1.cos().pow(2);
 return image.addBands(numerator2.divide(denominator2).rename('VH_Norm'));
}
function gammaNoughtRefVV(image) {
 var numerator1 = image.select('VV').multiply(37.55).divide(180).multiply(Math.PI);
 var numerator2 = numerator1.cos().pow(2);
 var denominator1 = image.select('angle').divide(180.00).multiply(Math.PI);
 var denominator2 = denominator1.cos().pow(2);
 return image.addBands(numerator2.divide(denominator2).rename('VV_Norm'));
}
var normalisedSAR = sent1C.map(gammaNoughtRefVV);
normalisedSAR = normalisedSAR.map(gammaNoughtRefVH);


//functions to apply refined lee filtering to normalised VV and VH
function leeFilteredVV(image) {
 var toNatural = lee.toNatural(image.select('VV_Norm'));
 var toDB = lee.toDB(lee.refinedLee(toNatural));
 return image;
}
function leeFilteredVH(image) {
 var toNatural = lee.toNatural(image.select('VH_Norm'));
 var toDB = lee.toDB(lee.refinedLee(toNatural));
 return image;
}
var leeFiltered = normalisedSAR.map(leeFilteredVV);
leeFiltered = leeFiltered.map(leeFilteredVH);


//map over the sequence (same previous sequence used for Sentinel-2 A/B)
var sent1C_Composites = imgRange.map(function(num){
  num = ee.Number(num);
  var windowStart = startDate.advance(num.multiply(interval), 'day');
  var windowEnd = startDate.advance(num.add(1).multiply(interval), 'day');
  var subGroup = normalisedSAR.filterDate(windowStart, windowEnd);
  var composite = ee.Image.cat([(subGroup.select('VV_Norm').mean()),(subGroup.select('VH_Norm').mean())]);
  return composite.clip(studyExtent).set('system:time_start', windowStart);
  });
print("Initial List of Sentinel-1C 12-Day Composites", sent1C_Composites);
// remove null images (images without bands)
sent1C_Composites = sent1C_Composites
    .map(function(item) {
      return ee.Image(item).set('count', ee.Image(item).bandNames().length());
    })
    .filter(ee.Filter.neq('count', 0));
    
// converting list of SAR composite images to imagecollection 
sent1C_Composites = ee.ImageCollection.fromImages(sent1C_Composites);

//Perform Log Ratio to lee-filtered and normalised VV and VH
var addLogRatio = function(img) {
  var logVV = img.select('VV_Norm');
  var logVH = img.select('VH_Norm');
  var logratio = logVV.subtract(logVH).rename('logR');
  var LogRatio_VV_VH_Norm = logratio.toDouble();
  return img.addBands(LogRatio_VV_VH_Norm);
};

sent1C_Composites = sent1C_Composites.map(addLogRatio);
print("Filtered List of Sentinel-1C (SAR) 12-Day Composite", sent1C_Composites);



// Chart annual time series of mean NDVI and ARVI for study area


//Legend Options
var legendOptionsNDVI = {
  title: 'Sentinel-2A/B NDVI Annual Profile',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Values'},
  lineWidth: 2,
  series: {
    0: {color: '00FF00'},
    1: {color: '0000FF'}, }
    
  };
  
  var legendOptionsARVI = {
  title: 'Sentinel-2A/B ARVI Annual Profile',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Values'},
  lineWidth: 2,
  series: {
    0: {color: '0000FF'},
    1: {color: '00FF00'}, }
    
  };
  
  var legendOptionsLogR = {
  title: 'Annual Sentinel-1C (SAR) VV/VH Log Ratio (logR) Profile',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Values'},
  lineWidth: 2,
  series: {
    0: {color: 'FFA07A'},
    1: {color: 'FFFF00'}, }
    
  };


var chartNDVI = ui.Chart.image.series({
    imageCollection: sent2AB_Composit1.select('NDVI'), 
    region: studyExtent, 
    reducer: ee.Reducer.mean(),
    scale: 10,
}).setChartType('LineChart').setOptions(legendOptionsNDVI);
print(chartNDVI);  //** you can export the figure or data in the pop-out


var chartARVI = ui.Chart.image.series({
    imageCollection: sent2AB_Composit1.select('ARVI'), 
    region: studyExtent, 
    reducer: ee.Reducer.mean(),
    scale: 10,
}).setChartType('LineChart').setOptions(legendOptionsARVI);
print(chartARVI);  //** you can export the figure or data in the pop-out

var chartLogRatio = ui.Chart.image.series({
    imageCollection: sent1C_Composites.select('logR'), 
    region: studyExtent, 
    reducer: ee.Reducer.mean(),
    scale: 10,
}).setChartType('LineChart').setOptions(legendOptionsLogR);
print(chartLogRatio); //** you can export the figure or data in the pop-out



// export composites to Asset Folder or other storage ///

//Note: toAsset can work with specific date formats not the ee automatic format set in milliseconds(numbers)
batchExport.Download.ImageCollection.toAsset(sent2AB_Composites, 'agrLandSeg/sent2AB_ImgCollec', 
                { 
                  scale: 10, 
                  region: studyExtent, 
                  maxPixels: 1e13,
                  dateFormat: 'yyyy-MM-dd'
                });
   
batchExport.Download.ImageCollection.toAsset(sent1C_Composites, 'agrLandSeg/sent1C_ImgCollec', 
                { 
                  scale: 10, 
                  region: studyExtent, 
                  maxPixels: 1e13,
                  dateFormat: 'yyyy-MM-dd'
                });

/*
//Note: toDrive requires ee automatic date format set im milliseconds(numbers)
// to download to gDrive, it is better to run the custom python code (export2drive.py) in your python environment  
batchExport.Download.ImageCollection.toDrive(sent2AB_Composites, 
                'Sent2AB', 
                {scale: 10, 
                 maxPixels:1e13,
                 region: studyExtent, 
                 type: 'double'})

batchExport.Download.ImageCollection.toDrive(sent1C_Composites, 
                'Sent1C', 
                {scale: 10, 
                 maxPixels:1e13,
                 region: studyExtent, 
                 type: 'double'})
                 
*/
