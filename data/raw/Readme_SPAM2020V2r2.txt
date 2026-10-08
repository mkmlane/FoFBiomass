*****************************************
* SPAM 2020 V2r2          * April-22-2026 *
*****************************************

Results for Global SPAM 2020 V2r2 
Pixel values for 4 variables and 3 technologies, with individual crops and crop groups in each record, csv format
Pixel values for 4 variables, 3 technologies, 46 crops, geotif format

***********************************************
Differences compared to SPAM2020V2r2
***********************************************

- Updated the share of farming systems in the United States
- Updated the subnational agricultural statistics for Ghana, the United Kingdom, and Côte d’Ivoire, and added administrative level 1 subnational statistics
- Updated the crop intensity files for Ghana, the United Kingdom, and Côte d’Ivoire
- Changed the unit of yield from tons/ha to kg/ha

***********************************************
Differences compared to SPAM2020V1r0
***********************************************

- Updated subnational agricultural statistics datasets with newly collected and digitized information
- Processed and included all feedbacks and comments from users of SPAM2020V1r0. Thank you!! 
- Fixed missing crops in certain districts and countries
- Refined the crop extent input layer for countries where cropland area was previously underestimated
- Corrected the values of the suitability input layers in some countries 
- Updated the crop intensity layers
- Resolved cases where the sum of the crop physical areas in a pixel exceeded the total pixel area
- Corrected pixels reporting implausible yield values 
- Revised rice and rapeseed distributions in China using additional agricultural information  
- Fine-trued and updated parameter in the SPAM Model
- Updated the administrative boundary in a few countries 


*****************************************
Major updates from previous 2010 (global) and 2017 (SSA) version

The SPAM model has been migrated from a FOXPro program to a R-based program environment, and it is hosted at GitHub as an open access project.
The Global Agro-Ecological Zones have been upgraded to version 4.(from previous version 3)
The baseline map of landcover data has been updated to circa 2020.
Subnational data and national statistics have been updated to circa 2020 or the most recent years.
Population data has been brought up to date to 2020.
Market access data (e.g. road networks) has also been revised to the most recent years.

*****************************************
This is the SPAM 2020 V2r0. Please keep the complaints/comments coming, they are very helpful!
contacts: Zhe Guo (z.guo@cgiar.org), Shuang Zhou (s.zhou@cgiar.org)

************************************************************
For data citation, please use:

International Food Policy Research Institute (IFPRI), 2025, "Global Spatially-Disaggregated Crop Production Statistics Data for 2020 Version 2.0.0", https://doi.org/10.7910/DVN/SWPENT, Harvard Dataverse, V2



Files in folder Global-csv/Global-Geotiff and naming conventions
************************************************************

Zip files in Global_csv folder:
*********
spam2020V2r0_global_harvested_area.zip	     SPAM harvested area, global pixels, files for 3 technologies
spam2020V2r0_global_physical_area.zip	     SPAM physical area, global pixels, files for 3 technologies
spam2020V2r0_global_production.zip           SPAM production, global pixels, files for 3 technologies
spam2020V2r0_global_yield.zip	             SPAM yield, global pixels, files for 3 technologies
  
Zip files in Global_Geotiff folder
*********
spam2020V2r0_global_harvested_area.zip	     SPAM harvested area, global pixels, files for 3 technologies
spam2020V2r0_global_physical_area.zip	     SPAM physical area, global pixels, files for 3 technologies
spam2020V2r0_global_production.zip	     SPAM production, global pixels, files for 3 technologies
spam2020V2r0_global_yield.zip  		     SPAM yield, global pixels, files for 3 technologies

File names
*************
All files have standard names, which allow direct identification of variable and technology:

For csv files:
spam2020V2r0_global_v_t.csv

For Geotiff files:
spam2020V2r0_global_v_x_t.tif

where
v = variable 
t = technology

v: Variables
**************
*_A_*		physical area
*_H_*		harvested area
*_P_*		production
*_Y_*		yield

t: Technologies
******************
*_TA	all technologies together, ie complete crop
*_TI	irrigated portion of crop
*_TR	rainfed portion of crop (= TA - TI)

x: Crops
see the bottom of this file for the crop lookup table

In the CSV file
**************
each pixel (row) has
13 fields to identify a pixel:
   grid_code (pixel ID), ADM0_NAME (=FIPS0), ADM1_NAME (=FIPS1), ADM2_NAME (=FIPS2), x (x-coordinate - longitude of centroid), 
y (y-coordinate - latitude of centroid), rec_type (same to variables), tech_type (see technologies above), 
unit (units of the variables), year_data (year of the data)

46 fields for 46 crops: 
     similar to SPAM notation: crop_T, where T = A, I, or R



ID   SPAM name	Crop name
1	whea	Wheat
2	rice	Rice
3	maiz	Maize
4	barl	Barley
5	mill	Small Millet
6	pmil	Pearl Millet
7	sorg	Sorghum
8	ocer	Other Cereals
9	pota	Potato
10	swpo	Sweet Potato
11	yams	Yams
12	cass	Cassava
13	orts	Other Roots
14	bean	Bean
15	chic	Chickpea
16	cowp	Cowpea
17	pige	Pigeon Pea
18	lent	Lentil
19	opul	Other Pulses
20	soyb	Soybean
21	grou	Groundnut
22	cnut	Coconut
23	oilp	Oilpalm
24	sunf	Sunflower
25	rape	Rapeseed
26	sesa	Sesame Seed
27	ooil	Other Oil Crops
28	sugc	Sugarcane
29	sugb	Sugarbeet
30	cott	Cotton
31	ofib	Other Fibre Crops
32	coff	Arabic Coffee
33	rcof	Robust Coffee
34	coco	Cocoa
35	teas	Tea
36	toba	Tobacco
37	bana	Banana
38	plnt	Plantain
39	citr	Citrus
40	trof	Other Tropical Fruit
41	temf	Temperate Fruit
42	toma	Tomato
43	onio	Onion
44	vege	Other Vegetables
45	rubb	Rubber
46	rest	Rest Of Crops
