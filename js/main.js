define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/arcgis/utils",
    "esri/graphicsUtils",
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "esri/tasks/query",
    "dojo/dom-class",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "dojo/_base/event",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "modules/LayerLegend",
    "modules/AboutDialog",
    "modules/ShareDialog",
    "modules/Drawer",
    "modules/DrawerMenu",
    "esri/dijit/HomeButton",
    "esri/dijit/LocateButton",
    "esri/dijit/BasemapToggle",
    "esri/dijit/Geocoder",
    "modules/StatsBlock",
    "esri/dijit/Popup",
    "dojo/window"
],
function(
    declare,
    lang,
    arcgisUtils,
    graphicsUtils,
    domConstruct,
    dom,
    on,
    domStyle,
    domAttr,
    Query,
    domClass,
    SimpleFillSymbol, SimpleLineSymbol,
    Color,
    event,
    Graphic, GraphicsLayer,
    LayerLegend, AboutDialog, ShareDialog, Drawer, DrawerMenu,
    HomeButton, LocateButton, BasemapToggle,
    Geocoder,
    StatsBlock,
    Popup,
    win
) {
    return declare("", null, {
        config: {},
        constructor: function (config) {
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            this.config = config;
            // css classes
            this.css = {
                toggleBlue: 'toggle-grey',
                toggleBlueOn: 'toggle-grey-on',
                rendererMenu: 'menuList',
                rendererMenuItem: 'item',
                rendererSelected: 'selected',
                rendererLoading: 'loadingFeatures',
                rendererContainer: 'item-container',
                rendererSummarize: 'summarize',
                mobileSearchDisplay: "mobileLocateBoxDisplay"
            };
            // mobile size switch domClass
            this._showDrawerSize = 850;
            this._entireAreaValue = "summarize";
            // drawer
            this._drawer = new Drawer({
                showDrawerSize: this._showDrawerSize,
                container: dom.byId('bc_outer'),
                contentCenter: dom.byId('cp_outer_center'),
                contentLeft: dom.byId('cp_outer_left'),
                toggleButton: dom.byId('hamburger_button')
            });
            // drawer resize event
            on(this._drawer, 'resize', lang.hitch(this, function () {
                // check mobile button status
                this._checkMobileGeocoderVisibility();
                // resize stats block
                if (this._sb) {
                    this._sb.resize();
                }
            }));
            // startup drawer
            this._drawer.startup();
            // lets get that webmap
            this._createWebMap();
        },
        _selectFeatures: function (features) {
            if (features && features.length) {
                // add features to graphics layer
                this._selectedGraphics.clear();
                // each selected feature
                for (var i = 0; i < features.length; i++) {
                    // selected line symbol
                    var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 1]), 2);
                    // selected fill symbol
                    var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, sls, new Color([0, 255, 255, 0]));
                    // selected graphic
                    var g = new Graphic(features[i].geometry, symbol, features[i].attributes, null);
                    if (g) {
                        // add graphic to layer
                        this._selectedGraphics.add(g);
                    }
                }
                // single fature
                if (features.length === 1) {
                    // has attribute field for renderer
                    if (this._attributeField && features[0].attributes.hasOwnProperty(this._attributeField)) {
                        var value = features[0].attributes[this._attributeField];
                        if (this._rendererNodes && this._rendererNodes.length) {
                            // each renderer nodes
                            for (i = 0; i < this._rendererNodes.length; i++) {
                                // value matches
                                if (this._rendererNodes[i].value === value) {
                                    // set selected
                                    domClass.add(this._rendererNodes[i].node, this.css.rendererSelected);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        },
        // get layer of impact
        _getImpactLayer: function (obj) {
            var mapLayer, layer, i;
            // if we have a layer id
            if (obj.id) {
                for (i = 0; i < obj.layers.length; i++) {
                    layer = obj.layers[i];
                    if (layer.id === obj.id) {
                        mapLayer = obj.map.getLayer(layer.id);
                        mapLayer.layerIndex = i;
                        return mapLayer;
                    }
                }
            } else if (obj.title) {
                // use layer title
                for (i = 0; i < obj.layers.length; i++) {
                    layer = obj.layers[i];
                    if (layer.title.toLowerCase() === obj.title.toLowerCase()) {
                        mapLayer = obj.map.getLayer(layer.id);
                        mapLayer.layerIndex = i;
                        return mapLayer;
                    }
                }
            }
            return false;
        },
        _queryFeatures: function (node, value) {
            // show layer if invisible
            if (!this._impactLayer.visible) {
                this._impactLayer.setVisibility(true);
            }
            // remove any selected
            this._clearSelected();
            domClass.add(node, this.css.rendererSelected);
            domClass.add(node, this.css.rendererLoading);
            // search query
            var q = new Query();
            q.returnGeometry = true;
            if (value === this._entireAreaValue || value === "") {
                // results
                q.where = '1 = 1';
            } else {
                // match value
                if (isNaN(value)) {
                    q.where = this._attributeField + ' = ' + "'" + value + "'";
                } else {
                    q.where = this._attributeField + ' = ' + value;
                }
            }
            var ct = node;
            // query features
            this._impactLayer.queryFeatures(q, lang.hitch(this, function (fs) {
                // remove current renderer
                domClass.remove(ct, this.css.rendererLoading);
                // display geo stats
                this._sb.set("features", fs.features);
                this._selectFeatures(fs.features);
                // set extent for features
                this.map.setExtent(graphicsUtils.graphicsExtent(fs.features), true);
            }), lang.hitch(this, function () {
                // remove selected
                this._clearSelected();
            }));
        },
        _createRendererItemClick: function (node, value) {
            // renderer item click
            on(node, 'click', lang.hitch(this, function (evt) {
                this._hideInfoWindow();
                var ct = evt.currentTarget;
                // current renderer isn't already selected
                if (!domClass.contains(ct, this.css.rendererSelected)) {
                    // view screen
                    var vs = win.getBox();
                    // hide drawer for small res
                    if (vs.w < this._showDrawerSize) {
                        this._drawer.toggle().then(lang.hitch(this, function () {
                            // resize map
                            this.map.resize();
                            // wait for map to be resized
                            setTimeout(lang.hitch(this, function () {
                                // get features
                                this._queryFeatures(ct, value);
                            }), 250);
                        }));
                    } else {
                        // get features
                        this._queryFeatures(ct, value);
                    }
                }
            }));
        },
        _createRendererItems: function (infos) {
            // renderer node items created
            this._rendererNodes = [];
            // create list 
            var ulList = domConstruct.create('ul', {
                className: this.css.rendererMenu
            });
            // create select all item
            var selectAll = domConstruct.create('li', {
                className: this.css.rendererMenuItem + " " + this.css.rendererSummarize
            });
            // create select all item container
            domConstruct.create('div', {
                className: this.css.rendererContainer,
                innerHTML: this.config.i18n.general.summarize
            }, selectAll);
            // select all click event
            this._createRendererItemClick(selectAll, this._entireAreaValue);
            // place item
            domConstruct.place(selectAll, ulList, 'last');
            // save reference to select all node
            this._rendererNodes.push({
                value: this._entireAreaValue,
                node: selectAll
            });
            // each renderer item
            for (var i = 0; i < infos.length; i++) {
                // create list item
                var liItem = domConstruct.create('li', {
                    className: this.css.rendererMenuItem
                });
                // symbol color
                var symbolColor = infos[i].symbol.color;
                var hex = symbolColor.toHex();
                // create list container
                domConstruct.create('div', {
                    className: this.css.rendererContainer,
                    style: 'border-left-color:' + hex + '; border-left-color:rgb(' + symbolColor.r + ',' + symbolColor.g + ',' + symbolColor.b + '); border-left-color:rgba(' + symbolColor.r + ',' + symbolColor.g + ',' + symbolColor.b + ',' + symbolColor.a + ');',
                    innerHTML: infos[i].label
                }, liItem);
                // value
                var value = infos[i].maxValue || infos[i].value || "";
                // click event
                this._createRendererItemClick(liItem, value);
                // place item
                domConstruct.place(liItem, ulList, 'last');
                // save node for reference
                this._rendererNodes.push({
                    value: value,
                    node: liItem
                });
            }
            // renderer dom node
            var rendererMenu = dom.byId('renderer_menu');
            if (rendererMenu) {
                // place
                domConstruct.place(ulList, rendererMenu);
                // display renderer
                domStyle.set(rendererMenu, 'display', 'block');
            }
        },
        _getLayerInfos: function () {
            this._multiple = false;
            // multiple polygons
            var renderer = this._impactLayer.renderer;
            // renderer exists
            if (renderer) {
                this._attributeField = renderer.attributeField;
                // renderer layer infos
                var infos = renderer.infos;
                if (infos && infos.length) {
                    this._multiple = true;
                    this._impactInfos = infos;
                }
            }
        },
        // clear selected renderer & loading status
        _clearSelected: function () {
            // if items are there
            if (this._rendererNodes && this._rendererNodes.length) {
                // remove classes from each item
                for (var i = 0; i < this._rendererNodes.length; i++) {
                    domClass.remove(this._rendererNodes[i].node, this.css.rendererSelected);
                    domClass.remove(this._rendererNodes[i].node, this.css.rendererLoading);
                }
            }
        },
        _selectEvent: function (evt) {
            // graphic selected
            if (evt.graphic) {
                this._clearSelected();
                this._sb.set("features", [evt.graphic]);
                this._selectFeatures([evt.graphic]);
                event.stop(evt);
            }
        },
        _hideInfoWindow: function () {
            if (this.map && this.map.infoWindow) {
                this.map.infoWindow.hide();
            }
        },
        _initImpact: function () {
            // impact layer found
            if (this._impactLayer) {
                // selected graphics layer
                this._selectedGraphics = new GraphicsLayer({
                    id: "selectedArea",
                    visible: this._impactLayer.visible
                });
                this.map.addLayer(this._selectedGraphics, (this._impactLayer.layerIndex + 1));
            }
            // renderer layer infos
            if (this._impactInfos) {
                // create renderer menu
                this._createRendererItems(this._impactInfos);
            }
            // features query
            var q = new Query();
            q.returnGeometry = false;
            q.where = '1=1';
            // if multiple features. (determined by renderer)
            if (this._multiple && this._attributeField) {
                // order by attribute field
                q.orderByFields = [this._attributeField + ' DESC'];
            }
            // if impact layer exists
            if (this._impactLayer) {
                // get impact features
                this._impactLayer.queryFeatures(q, lang.hitch(this, function (fs) {
                    // features were returned
                    if (fs.features && fs.features.length) {
                        // display stats
                        this._sb.set("features", [fs.features[0]]);
                        this._sb.startup();
                        // selected features
                        this._selectFeatures([fs.features[0]]);
                    }
                }));
                // selected poly from graphics layer
                on(this._selectedGraphics, 'click', lang.hitch(this, function (evt) {
                    this._hideInfoWindow();
                    this._selectEvent(evt);
                }));
                // selected poly from impact layer
                on(this._impactLayer, 'click', lang.hitch(this, function (evt) {
                    this._hideInfoWindow();
                    this._selectEvent(evt);
                }));
                // impact layer show/hide
                on(this._impactLayer, 'visibility-change', lang.hitch(this, function (evt) {
                    // set visibility of graphics layer
                    this._selectedGraphics.setVisibility(evt.visible);
                    // if not visible
                    if (!evt.visible) {
                        // hide stats
                        this._sb.hide();
                    } else {
                        // show stats
                        this._sb.show();
                    }
                }));
            }
            this._sb.show();
        },
        _init: function () {
            // get layer by id
            this._impactLayer = this._getImpactLayer({
                map: this.map,
                layers: this.layers,
                title: this.config.impact_layer_title,
                id: this.config.impact_layer_id
            });
            // get impact layer infos
            this._getLayerInfos();
            // drawer size check
            this._drawer.resize();
            // menu panels
            var menus = [];
            // multiple polygons
            if (this._multiple) {
                menus.push({
                    label: this.config.i18n.general.impact,
                    content: '<div id="renderer_menu"></div>'
                });
            }
            // legend menu
            menus.push({
                label: this.config.i18n.general.legend,
                content: '<div id="LayerLegend"></div>'
            });
            console.log(2);
            // menus
            this._drawerMenu = new DrawerMenu({
                menus: menus
            }, dom.byId("drawer_menus"));
            this._drawerMenu.startup();
            console.log(3);
            // locate button
            var LB = new LocateButton({
                map: this.map,
                theme: "LocateButtonCalcite"
            }, 'LocateButton');
            LB.startup();
            // home button
            var HB = new HomeButton({
                map: this.map,
                theme: "HomeButtonCalcite"
            }, 'HomeButton');
            HB.startup();
            // basemap toggle
            var BT = new BasemapToggle({
                map: this.map,
                basemap: "hybrid",
                defaultBasemap: "topo"
            }, 'BasemapToggle');
            BT.startup();
            // about dialog
            this._AboutDialog = new AboutDialog({
                theme: "icon-right",
                item: this.item,
                sharinghost: this.config.sharinghost
            }, 'AboutDialog');
            this._AboutDialog.startup();
            // share dialog
            this._ShareDialog = new ShareDialog({
                theme: "icon-right",
                bitlyLogin: this.config.bitlyLogin,
                bitlyKey: this.config.bitlyKey,
                map: this.map
            }, 'ShareDialog');
            this._ShareDialog.startup();
            // Legend table of contents
            var legendNode = dom.byId('LayerLegend');
            if (legendNode) {
                var LL = new LayerLegend({
                    map: this.map,
                    layers: this.layers
                }, legendNode);
                LL.startup();
            }
            console.log(4);
            // geocoders
            this._createGeocoders();
            // todo
            /* Start temporary until after JSAPI 3.9 is released */
            var layers = this.map.getLayersVisibleAtScale(this.map.getScale());
            on.once(this.map, 'basemap-change', lang.hitch(this, function () {
                for (var i = 0; i < layers.length; i++) {
                    if (layers[i]._basemapGalleryLayerType) {
                        var layer = this.map.getLayer(layers[i].id);
                        this.map.removeLayer(layer);
                    }
                }
            }));
            // todo
            /* END temporary until after JSAPI 3.9 is released */
            // stats block
            this._sb = new StatsBlock({
                config: this.config.impact_attributes
            }, dom.byId('geoData'));
            this._sb.startup();
            // init impact layer
            this._initImpact();
            // hide loading div
            this._hideLoadingIndicator();
        },
        _checkMobileGeocoderVisibility: function () {
            // check if mobile icon needs to be selected
            if (domClass.contains(dom.byId("mobileGeocoderIcon"), this.css.toggleBlueOn)) {
                domClass.add(dom.byId("mobileSearch"), this.css.mobileSearchDisplay);
            }
        },
        _showMobileGeocoder: function () {
            domClass.add(dom.byId("mobileSearch"), this.css.mobileSearchDisplay);
            domClass.replace(dom.byId("mobileGeocoderIconContainer"), this.css.toggleBlueOn, this.css.toggleBlue);
        },
        _hideMobileGeocoder: function () {
            domClass.remove(dom.byId("mobileSearch"), this.css.mobileSearchDisplay);
            domStyle.set(dom.byId("mobileSearch"), "display", "none");
            domClass.replace(dom.byId("mobileGeocoderIconContainer"), this.css.toggleBlue, this.css.toggleBlueOn);
        },
        _setTitle: function (title) {
            // map title node
            var node = dom.byId('title');
            if (node) {
                // set title
                node.innerHTML = title;
                // title attribute
                domAttr.set(node, "title", title);
            }
            // window title
            window.document.title = title;
        },
        // create geocoder widgets
        _createGeocoders: function () {
            // desktop size geocoder
            this._geocoder = new Geocoder({
                map: this.map,
                theme: 'calite',
                autoComplete: true
            }, dom.byId("geocoderSearch"));
            this._geocoder.startup();
            // geocoder results
            on(this._geocoder, 'find-results', lang.hitch(this, function (response) {
                if (!response.results.length) {
                    console.log(this.config.i18n.general.noSearchResult);
                }
            }));
            // mobile sized geocoder
            this._mobileGeocoder = new Geocoder({
                map: this.map,
                theme: 'calite',
                autoComplete: true
            }, dom.byId("geocoderMobile"));
            this._mobileGeocoder.startup();
            // geocoder results
            on(this._mobileGeocoder, 'find-results', lang.hitch(this, function (response) {
                if (!response.results.length) {
                    console.log(this.config.i18n.general.noSearchResult);
                }
                this._hideMobileGeocoder();
            }));
            // keep geocoder values in sync
            this._geocoder.watch("value", lang.hitch(this, function (name, oldValue, value) {
                this._mobileGeocoder.set("value", value);
            }));
            // keep geocoder values in sync
            this._mobileGeocoder.watch("value", lang.hitch(this, function (name, oldValue, value) {
                this._geocoder.set("value", value);
            }));
            // mobile geocoder toggle            
            var mobileIcon = dom.byId("mobileGeocoderIcon");
            if (mobileIcon) {
                on(mobileIcon, "click", lang.hitch(this, function () {
                    if (domStyle.get(dom.byId("mobileSearch"), "display") === "none") {
                        this._showMobileGeocoder();
                    } else {
                        this._hideMobileGeocoder();
                    }
                }));
            }
            // cancel mobile geocoder
            on(dom.byId("btnCloseGeocoder"), "click", lang.hitch(this, function () {
                this._hideMobileGeocoder();
            }));
        },
        // hide map loading spinner
        _hideLoadingIndicator: function () {
            var indicator = dom.byId("loadingIndicatorDiv");
            if (indicator) {
                domStyle.set(indicator, "display", "none");
            }
        },
        //create a map based on the input web map id
        _createWebMap: function () {
            // popup dijit
            var customPopup = new Popup({}, domConstruct.create("div"));
            // add popup theme
            domClass.add(customPopup.domNode, "calcite");
            //can be defined for the popup like modifying the highlight symbol, margin etc.
            arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                mapOptions: {
                    infoWindow: customPopup
                    //Optionally define additional map config here for example you can
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more.
                },
                bingMapsKey: this.config.bingmapskey
            }).then(lang.hitch(this, function (response) {
                //Once the map is created we get access to the response which provides important info
                //such as the map, operational layers, popup info and more. This object will also contain
                //any custom options you defined for the template. In this example that is the 'theme' property.
                //Here' we'll use it to update the application to match the specified color theme.
                this.map = response.map;
                this.layers = response.itemInfo.itemData.operationalLayers;
                this._setTitle(response.itemInfo.item.title);
                this.item = response.itemInfo.item;
                if (this.map.loaded) {
                    this._init();
                } else {
                    on.once(this.map, 'load', lang.hitch(this, function () {
                        this._init();
                    }));
                }
            }), lang.hitch(this, function (error) {
                //an error occurred - notify the user. In this example we pull the string from the
                //resource.js file located in the nls folder because we've set the application up
                //for localization. If you don't need to support multiple languages you can hardcode the
                //strings here and comment out the call in index.html to get the localization strings.
                if (this.config && this.config.i18n) {
                    alert(this.config.i18n.map.error + ": " + error.message);
                } else {
                    alert("Unable to create map: " + error.message);
                }
            }));
        }
    });
});