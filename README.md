# impact-summary-map-template-js

![App](http://esri.github.io/impact-summary-map-template-js/images/item.png)

This interactive map highlights an area and shows a summary of data related to its location. The data presented in the boxes, at the bottom of the map, can be any integer data allowing you to answer new questions about locations that you cannot answer with maps alone.

For instance, in the web map you could enrich your polygon with demographics, landscape, infrastructure, and other variables using Enrich Layer or analyze your own data with Aggregate Points. Then you can use this template to show your analysis with a simple web mapping application.

[View it live](http://esri.github.io/impact-summary-map-template-js/)

The template can be configured using the following options:

- **Map:** Choose the web map to use in your application.
- **Responsive:** A side drawer is shown when its size can be accommodated. The responsive drawer can be toggled on or off by the user and allows the application to be embedded into blogs and websites.
- **Navigation:** Home and Locate buttons add ease of map navigation.
- **Content:** Summarize integer data by choosing a FeatureService layer containing the fields. A layer containing multiple features and has a renderer defined allows for selecting the features by the renderer values. An interactive dashboard provides ability to categorize fields in up to 4 group panels and page through the fields.
- **Summary:** Briefly describe your application in the "Area" panel.
- **Search:** Enable Searching for addresses and places.
- **Share:** Share this application through Twitter, Facebook, Google+ or generate HTML for embedding in a blog or website.
- **Basemap:** Enable toggling between two Esri basemaps.
- **Layers:** Toggle visibility of layers.
- **Legend:** Display a legend.
- **About:** Display information about the application. The dialog can also be set to open on startup.

## Instructions

1. Download and unzip the .zip file or clone the repository.
2. Web-enable the directory.
3. Access the .html page.
4. Start writing your template!

[New to Github? Get started here.](https://github.com/)

## Deploying

1. To deploy this application, download the template from Portal/ArcGIS Online and unzip it.
2. Copy the unzipped folder containing the web app template files, such as index.html, to your web server. You can rename the folder to change the URL through which users will access the application. By default the URL to the app will be `http://<Your Web Server>/<app folder name>/index.html`
3. Change the sharing host, found in defaults.js inside the config folder for the application, to the sharing URL for ArcGIS Online or Portal. For ArcGIS Online users, keep the default value of www.arcgis.com or specify the name of your organization.
  - ArcGIS Online Example:  `"sharinghost": location.protocol + "//" + “<your organization name>.maps.arcgis.com`
  - Portal Example where `arcgis` is the name of the Web Adaptor: `"sharinghost": location.protocol + "//" + "webadaptor.domain.com/arcgis"`
4. If you are using Portal or a local install of the ArcGIS API for JavaScript, change all references to the ArcGIS API for JavaScript in index.html to refer to your local copy of the API. Search for the references containing `"//js.arcgis.com/3.17"` and replace this portion of the reference with the url to your local install.
  - For example: `"//webadaptor.domain.com/arcgis/jsapi/jsapi"` where `arcgis` is the name of your Web Adaptor.
5. Copy a map or group ID from Portal/ArcGIS Online and replace the default web map ID in the application’s index.html page. You can now run the application on your web server or customize the application further.

> **Note:** If your application edits features in a feature service, contains secure services or web maps that aren't shared publicly, or generate requests that exceed 200 characters, you may need to set up and use a proxy page. Common situations where you may exceed the URL length are using complex polygons as input to a task or specifying a spatial reference using well-known text (WKT). For details on installing and configuring a proxy page see [Using the proxy](https://developers.arcgis.com/javascript/jshelp/ags_proxy.html). If you do not have an Internet connection, you will need to access and deploy the ArcGIS API for JavaScript documentation from [developers.arcgis.com](https://developers.arcgis.com/).

## Data Layer Requirements
The template requires a FeatureLayer with numeric attributes to show the data in the block panel over the map.

## Configuring The Template
This template has an application builder built into it. If you're using this template via ArcGIS.com, you can take advantage of this builder while logged into ArcGIS. If you are the owner of the application via the appid parameter, you will see an option to enter the builder mode and start configuring the template.

If you are not using ArcGIS Online applications, you can configure this template using the defaults.js in the config folder. To configure the data layer, enter the FeatureLayer ID into the "summaryLayer":"id" property. You will need to know the ID of this layer. The ID of the layer can be seen in the webmap JSON response or by logging the FeatureLayer object to the console.

Once you have the layer with the data configured, you can start entering which attributes you would like to show by editing the "summaryAttributes" property in the defaults.js.

You can specify 1-4 main variables and each can have 0-many sub-variables that will be shown when the main variable is clicked. For the main variable, you can optionally link to a source for the data. Each variable can have a label for it as well.

### Layer Example

    "summaryLayer": {
        "id": "THE_ID_OF_MY_LAYER"
    },

### Attributes example

    "summaryAttributes": [{
        "attribute": "MY_MAIN_VARIABLE",
        "label": "My Variable",
        "dataSourceUrl": "http://mydata.com/",
        "children": [{
            "attribute": "MY_RELATED_VARIABLE 1",
            "label": "My Related Variable 1"
        }, {
            "attribute": "MY_RELATED_VARIABLE 2",
            "label": "My Related Variable 2"
        }]
    }]

 [New to Github? Get started here.](https://github.com/)

## Requirements

* Notepad or HTML editor
* A little background with Javascript
* Experience with the [ArcGIS Javascript API](http://www.esri.com/) would help.

## Webfonts

This application uses a custom webfont created on [Fontello](http://fontello.com/). If you're hosting this application on your own server, make sure that it's configured to host the webfont files with the correct mime types. Some servers require a mime type set for these files to be able to serve them correctly. See the following URLs for more information. There is a zip archive of the webfont with it's fontello config in the "resources" folder in this repository.
- [IIS Mime types](http://codingstill.com/2013/01/set-mime-types-for-web-fonts-in-iis/)
- [Properly serve webfonts](http://blog.symbolset.com/properly-serve-webfonts)

## Resources

* [ArcGIS for JavaScript API Resource Center](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
* [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Anyone and everyone is welcome to contribute. :)

## Licensing
Copyright 2012 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://raw.github.com/Esri/impact-summary-map-template-js/master/license.txt) file.

[](Esri Tags: ArcGIS ArcGIS Online Web Application Local Impact Map template Public)
[](Esri Language: JavaScript)
