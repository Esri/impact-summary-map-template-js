define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "esri/arcgis/utils",
    "esri/IdentityManager",
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/on",
    "dojo/number",
    "dojo/dom-style",
    "dojo/dom-attr",
    "esri/tasks/query",
    "esri/layers/FeatureLayer",
    "dojo/dom-class",
    "dojo/query",
    "dojo/aspect",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "application/Mustache",
    "dojo/text!views/panels.html",
    "dojo/text!views/renderer.html",
    "dojo/_base/event",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "esri/urlUtils",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/fx",
    "dojo/fx/easing",
    "dojo/dom-geometry",
    "modules/LayerLegend",
    "modules/AboutDialog",
    "modules/ShareDialog",
    "esri/dijit/HomeButton",
    "esri/dijit/LocateButton",
    "esri/dijit/BasemapToggle",
    "esri/dijit/Geocoder",
    "dijit/Dialog",
    "modules/Slider",
    "esri/dijit/Popup",
        "dojo/fx"
],
function(
    ready,
    declare,
    lang,
    array,
    arcgisUtils,
    IdentityManager,
    domConstruct,
    dom,
    on,
    number,
    domStyle,
    domAttr,
    Query,
    FeatureLayer,
    domClass,
    query,
    aspect,
    SimpleFillSymbol, SimpleLineSymbol,
    Color,
    Mustache,
    panelsView, rendererView,
    event,
    Graphic, GraphicsLayer,
    urlUtils,
    BorderContainer, ContentPane,
    fx,
    easing,
    domGeom,
    LayerLegend, AboutDialog, ShareDialog,
    HomeButton, LocateButton, BasemapToggle,
    Geocoder,
    Dialog,
    Slider,
    Popup,
    coreFx
) {
    return declare("", null, {
        config: {},
        constructor: function(config) {
            this._containers();
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information. 
            this.config = config;
            this.isDrawerOpen = true;
            this._cssStyles();
            ready(lang.hitch(this, function() {
                this._setLanguageStrings();
                this._createWebMap();
            }));

            aspect.after(this, "_init", lang.hitch(this, function () {
                this._hideLoadingIndicator();
            }));
        },
        _setLanguageStrings: function(){
            var node;
            node = dom.byId('legend_name');
            if(node){
                node.innerHTML = this.config.i18n.general.legend;
            }
            node = dom.byId('impact_name');
            if(node){
                node.innerHTML = this.config.impact_layer || this.config.i18n.general.impact;
            }
        },
        _cssStyles: function(){
            this.css = {
                toggleBlue: 'toggle-grey',
                toggleBlueOn: 'toggle-grey-on',
                menuItem: 'item',
                menuItemSelected: 'item-selected',
                menuPanel: 'panel',
                menuPanelSelected: 'panel-selected',
                rendererMenu: 'menuList',
                rendererMenuItem: 'item',
                rendererSelected: 'selected',
                rendererContainer: 'item-container',
                rendererSummarize: 'summarize',
                stats: 'geoData',
                statsPanel: 'panel',
                statsPanelSelected: 'panel-expanded'
            };
        },
        _containers: function() {
            // outer container
            this._bc_outer = new BorderContainer({gutters:false}, dom.byId('bc_outer'));
            // center panel
            var cp_outer_center = new ContentPane({
                region: "center"
            }, dom.byId('cp_outer_center'));
            this._bc_outer.addChild(cp_outer_center);
            // left panel
            var cp_outer_left = new ContentPane({
                region: "left"
            }, dom.byId('cp_outer_left'));
            this._bc_outer.addChild(cp_outer_left);
            this._bc_outer.startup();
            // inner countainer
            this._bc_inner = new BorderContainer({gutters:false}, dom.byId('bc_inner'));
            // top panel
            var cp_inner_top = new ContentPane({
                region: "top"
            }, dom.byId('cp_inner_top'));
            this._bc_inner.addChild(cp_inner_top);
            // center panel
            var cp_inner_center = new ContentPane({
                region: "center"
            }, dom.byId('cp_inner_center'));
            this._bc_inner.addChild(cp_inner_center);
            this._bc_inner.startup();
            this._bc_outer.layout();
            this._bc_inner.layout();
            on(dom.byId('hamburger_button'), 'click', lang.hitch(this, function(evt) {
                this._toggleDrawer();
                domClass.toggle(dom.byId('hamburger_button'), this.css.toggleBlueOn);
            }));
            this._drawer = cp_outer_left.domNode;
            this._drawerWidth = domGeom.getContentBox(this._drawer).w;
            this._drawerMenu();
        },
        _showDrawerPanel: function(buttonNode){
            var menus = query('.' +  this.css.menuItemSelected, dom.byId('drawer_menu'));
            var panels = query('.' + this.css.menuPanelSelected, dom.byId('drawer_panels'));
            var i;
            for(i = 0; i < menus.length; i++){
                domClass.remove(menus[i], this.css.menuItemSelected);
            }
            for(i = 0; i < panels.length; i++){
                domClass.remove(panels[i], this.css.menuPanelSelected);
            }
            var menu = domAttr.get(buttonNode, 'data-menu');
            domClass.add(buttonNode, this.css.menuItemSelected);
            domClass.add(menu, this.css.menuPanelSelected);
        },
        _drawerMenu: function(){
            var menus = query('.item', dom.byId('drawer_menu'));
            on(menus, 'click', lang.hitch(this, function(evt) {
                this._showDrawerPanel(evt.currentTarget);
            }));
        },
        _setTitle: function(title){
            var node = dom.byId('title');
            if(node){
                node.innerHTML = title;
            }
            window.document.title = title;
        },
        _toggleDrawer: function(){
            if(domStyle.get(this._drawer, 'display') === 'block'){
                fx.animateProperty({
                    node:this._drawer,
                    properties: {
                        width: { start:this._drawerWidth, end: 0 }
                    },
                    duration: 250,
                    easing: easing.expoOut,
                    onAnimate: lang.hitch(this, function(){
                        this._bc_outer.layout();
                    }),
                    onEnd: lang.hitch(this,function () {
                        domStyle.set(this._drawer,'display','none');
                        this._bc_outer.layout();
                        if (query(".geodata-container")[0] && domStyle.get(query(".geodata-container")[0], 'display') == 'none') {
                            domStyle.set(query(".geodata-container")[0], 'display', 'inline-block');
                        }

                    })
                }).play();

            }
            else {
                domStyle.set(this._drawer, 'display', 'block');
                this.isDrawerOpen = true;
                fx.animateProperty({
                    node:this._drawer,
                    properties: {
                        width: { start:0, end: this._drawerWidth }
                    },
                    duration: 250,
                    easing: easing.expoOut,
                    onAnimate: lang.hitch(this, function(){
                        this._bc_outer.layout();
                    }),
                    onEnd: lang.hitch(this, function(){
                        this._bc_outer.layout();
                    })
                }).play();
                if (window.innerWidth < 850) {
                    domStyle.set(query(".geodata-container")[0], 'display', 'none');
                }
            }
        },

        _displayContainer: function (node) {
            domStyle.set(node, 'display', 'block');
            setTimeout(function () {
                domClass.add(node, "animateSlider");
            }, 50);
        },
        _hideContainer: function (node) {
            setTimeout(function () {
                domClass.remove(node, "animateSlider");
            }, 50);
            domStyle.set(node, 'display', 'none');
        },
        _displayStats: function(features) {
	    var _self=this;
            if (features && features.length) {
                var variables = this.config.sum_variables;
                var sum = {}, i;
                if (features.length > 1) {
                    for (i = 0; i < features.length; i++) {
                        if (i === 0) {
                            sum = features[0].attributes;
                        } else {
                            for (var j = 0; j < variables.length; j++) {
                                if (features[i].attributes.hasOwnProperty(variables[j])) {
                                    sum[variables[j]] += features[i].attributes[variables[j]];
                                }
                            }
                        }
                    }
                } else {
                    sum = features[0].attributes;
                    if (features[0].attributes.hasOwnProperty(this._attributeField)) {
                        var value = features[0].attributes[this._attributeField];
                        var item = query('[data-value=' + value + ']', dom.byId('renderer_menu'));
                        if (item.length) {
                            domClass.add(item[0], this.css.rendererSelected);
                        }
                    }
                }
                sum.numFormat = function() {
                    return function(text, render) {
                        return number.format(parseInt(render(text), 10));
                    };
                };
                domStyle.set(this.dataNode, 'display', 'block');
                var output = Mustache.render(panelsView, sum);
                var selectedPanel, panelType;
                selectedPanel = query('.' + this.css.statsPanelSelected + '.animateSlider', this.dataNode)[0];
                if (selectedPanel) {
                    panelType = domAttr.get(selectedPanel, 'data-type');
                }
                this.dataNode.innerHTML = output;

                //Create Slider for Geo data panels
                var slider, objSlider, childNode, divGeoPanel;
                var sliderResizeHandler = null; //resize handler
                slider = query('.panel-expanded .tblSlideContainer');
                array.forEach(slider, function (node) {
                    divGeoPanel = query('.tblSlide', node)[0];
                    childNode = query('div', divGeoPanel).length;
                    _self._setPanelWidth(node.parentElement);
                    if (childNode > 3) {
                        if (divGeoPanel) {
                            objSlider = new Slider({ sliderContent: divGeoPanel, sliderParent: node });
                        }
                    }
                    if (!sliderResizeHandler) {
                        //set slider position on window resize
                        sliderResizeHandler = on(window, 'resize', lang.hitch(this, function () {
                            _self._setLeftPanelVisibility();
                            setTimeout(lang.hitch(this, function () {
                                array.forEach(slider, lang.hitch(this, function (sliderNode) {
                                    _self._setPanelWidth(sliderNode.parentElement);
                                    var divSlider = query('.divSliderContainer', sliderNode)[0];
                                    if (divSlider) {
                                        objSlider._resizeSlider(divSlider.id);
                                    }
                                }));
                            }, 100));
                        }));
                    }
                    domStyle.set(divGeoPanel.lastElementChild, "border", "none");
                });
                if (panelType) {
                    this._showExpanded(panelType, objSlider);
                }
                this._panelClick = on(query('.panel', this.dataNode), 'click', lang.hitch(this, function (evt) {
                    if (evt.stopPropagation) {
                        evt.stopPropagation();
                    } else {
                        evt.cancelBubble = true;
                    }
                    var type = domAttr.get(evt.currentTarget, 'data-type');
                    this._showExpanded(type, objSlider);

                }));
                this._expandedClick = on(query('.' + this.css.statsPanelSelected + ' .divHeaderClose', this.dataNode), 'click', lang.hitch(this, function (evt) {
                    if (evt.stopPropagation) {
                        evt.stopPropagation();
                    } else {
                        evt.cancelBubble = true;
                    }
                    this._hideExpanded(evt.currentTarget);

                }));
                this._expandedClick = on(query('.' + this.css.statsPanelSelected, this.dataNode), 'click', lang.hitch(this, function (evt) {
                    event.stop(evt);
                    evt.cancelBubble = true;
                }));
                // add features to graphics layer
                this._selectedGraphics.clear();
                for (i = 0; i < features.length; i++) {
                    var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 1]), 2);
                    var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, sls, new Color([0, 255, 255, 0]));
                    var g = new Graphic(features[i].geometry, symbol, features[i].attributes, null);
                    if (g) {
                        this._selectedGraphics.add(g);
                    }
                }
            } else {
                domStyle.set(this.dataNode, 'display', 'none');
            }
        },
        _setPanelWidth: function (node) {
            var sliderWidth = query('.geoPanel')[0].offsetWidth;
            domStyle.set(node, 'width', sliderWidth + 'px');
        },
        _setLeftPanelVisibility: function () {
            var clear;
            if (query(".geodata-container")[0]) {
                domStyle.set(query(".geodata-container")[0], 'display', 'inline-block');
            }
            if (window.innerWidth < 850) {
                if (domStyle.get(this._drawer, 'display') === 'block' && (this.isDrawerOpen)) {
                    this.isDrawerOpen = false;
                    domStyle.set(this._drawer, 'display', 'none');
                    this._bc_outer.layout();
                    domClass.toggle(dom.byId('hamburger_button'), this.css.toggleBlueOn);
                }
            }
            else {
                if (domStyle.get(this._drawer, 'display') === 'none' && !(this.isDrawerOpen)) {
                    this.isDrawerOpen = true;
                    domStyle.set(this._drawer, 'display', 'block');
                    this._bc_outer.layout();
                    domClass.toggle(dom.byId('hamburger_button'), this.css.toggleBlueOn);
                }
            }
        },
        _hideExpanded: function (element) {
            var domSlider, cont, divCount;
            domSlider = element.parentElement.parentElement;
            cont = query('.geoPanel')[0];
            divCount = query('.panel .count');

            //hide slider
            this._hideContainer(domSlider, 100);

            //display geo-data count panel
            array.forEach(divCount, function (elementCount) {
                domStyle.set(elementCount, 'display', 'block');
            });
            query('.' + this.css.menuPanel, this.dataNode).style('cursor', 'pointer');
        },
        _showExpanded: function (type, objSlider) {
            var domSlider, divCount, slider;
            domSlider = query('.' + this.css.statsPanelSelected + '[data-type="' + type + '"]', this.dataNode)[0];

            if (domStyle.get(domSlider, 'display') == 'none') {
                query('.' + this.css.statsPanelSelected, this.dataNode).style('display', 'none');
                query('.' + this.css.statsPanelSelected, this.dataNode).removeClass("animateSlider");
                query('.' + this.css.menuPanel, this.dataNode).style('cursor', 'pointer');
                divCount = query('.panel .count');
                slider = query('.divSliderContainer', domSlider)[0];

                //display slider
                this._displayContainer(domSlider, 250);
                //hide geo-data count panel.
                array.forEach(divCount, function (elementCount) {
                    domStyle.set(elementCount, 'display', 'none');
                });
                this._setPanelWidth(domSlider);
                if (slider) {
                    objSlider._resizeSlider(slider.id);
                }
                domStyle.set(query('.' + this.css.menuPanel + '[data-type="' + type + '"]', this.dataNode)[0], 'cursor', 'default');
            }
        },
        // get layer of impact area by layer title
        getLayerByTitle: function(map, layers, title) {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (layer.title.toLowerCase() === title.toLowerCase()) {
                    var mapLayer = map.getLayer(layer.id);
                    mapLayer.layerIndex = i;
                    return mapLayer;
                }
            }
            return false;
        },
        _setValueRange: function() {
            this._multiple = false;
            var renderer = this._impactLayer.renderer;
            this._attributeField = renderer ? renderer.attributeField : this.config.impact_field;
            if (renderer) {
                var infos = renderer.infos;
                if (infos && infos.length) {
                    // multiple polygon impact
                    this._multiple = true;
                    // template data
                    var data = {
                        i18n: this.config.i18n,
                        css: this.css,
                        infos: infos
                    };
                    var output = Mustache.render(rendererView, data);
                    if (output) {
                        dom.byId('renderer_menu').innerHTML = output;
                        domStyle.set(dom.byId('renderer_menu'), 'display', 'block');
                        this._summarizeClick = on(dom.byId('summarize'), 'click', lang.hitch(this, function(evt) {
                            this._clearSelected();
                            domClass.add(evt.currentTarget, this.css.rendererSelected);
                            var q = new Query();
                            q.where = '1 = 1';
                            this._impactLayer.queryFeatures(q, lang.hitch(this, function(fs) {
                                this._displayStats(fs.features);
                            }));
                        }));
                        on(query('.'  + this.css.rendererMenuItem, dom.byId('renderer_menu')), 'click', lang.hitch(this, function(evt) {
                            this._clearSelected();
                            var value = domAttr.get(evt.currentTarget, 'data-value');
                            domClass.add(evt.currentTarget, this.css.rendererSelected);
                            var q = new Query();
                            if (value === 0) {
                                q.where = '1 = 1';
                            } else {
                                q.where = this._attributeField + ' = ' + value;
                            }
                            this._impactLayer.queryFeatures(q, lang.hitch(this, function(fs) {
                                this._displayStats(fs.features);
                            }));
                        }));
                    }
                }
                else {
                    this._hideImapctArea();
                }
            }
            else {
                this._hideImapctArea();
            }
        },

        _hideImapctArea: function () {
            domStyle.set(dom.byId("imapct_content"), "display", "none");
            domStyle.set(dom.byId("legend_content"), { "width": "100%" });
            domStyle.set(dom.byId("legend_name"), "border-right", "none");
        },
        _selectEvent: function(evt) {
            if (evt.graphic) {
                this._clearSelected();
                this._displayStats([evt.graphic]);
                event.stop(evt);
            }
        },
        _init: function() {
            var LB = new LocateButton({
                map: this.map,
                theme: "LocateButtonCalcite"
            }, 'LocateButton');
            LB.startup();

            var HB = new HomeButton({
                map: this.map,
                theme: "HomeButtonCalcite"
            }, 'HomeButton');
            HB.startup();

            var BT = new BasemapToggle({
                map: this.map,
                basemap: "hybrid",
                defaultBasemap: "topo",
                theme: "BasemapToggleCalcite"
            }, 'BasemapToggle');
            BT.startup();

            this._AboutDialog = new AboutDialog({
                theme: "icon-right",
                item: this.item,
                sharinghost: this.config.sharinghost
            }, 'AboutDialog');
            this._AboutDialog.startup();

            this._ShareDialog = new ShareDialog({
                theme: "icon-right",
                config: this.config,
                map: this.map
            }, 'ShareDialog');
            this._ShareDialog.startup();

            var LL = new LayerLegend({
                map: this.map,
                layers: this.layers
            }, "LayerLegend");
            LL.startup();

            var geocoder = new Geocoder({
                map: this.map,
                theme: 'calite',
                autoComplete: true
            }, dom.byId("geocoderSearch"));
            geocoder.startup();

            var geocoder1 = new Geocoder({
                map: this.map,
                theme: 'calite',
                autoComplete: true
            }, dom.byId("geocoderMobile"));
            geocoder1.startup();
            dom.byId("mobileGeocoderIcon").onclick=function () {
                if(domClass.contains(dom.byId("mobileSearch"),"mobileLocateBoxHidden")) {
                    domClass.replace(dom.byId("mobileSearch"),"mobileLocateBox","mobileLocateBoxHidden");
                    domClass.replace(dom.byId("mobileGeocoderIcon"),"toggle-grey-on","toggleSearch");
                } else {
                    domClass.replace(dom.byId("mobileSearch"),"mobileLocateBoxHidden","mobileLocateBox");
                    domClass.replace(dom.byId("mobileGeocoderIcon"),"toggleSearch","toggle-grey-on");
                }
            };
            /* Start temporary until after JSAPI 3.8 is released */
            var layers = this.map.getLayersVisibleAtScale(this.map.getScale());
            on.once(this.map, 'basemap-change', lang.hitch(this, function(){
                for(var i = 0; i < layers.length; i++){
                    if(layers[i]._basemapGalleryLayerType){
                        var layer = this.map.getLayer(layers[i].id);
                        this.map.removeLayer(layer);
                    }
                }
            }));
            /* END temporary until after JSAPI 3.8 is released */

            this.dataNode = domConstruct.place(domConstruct.create('div', {
                className: this.css.stats
            }), dom.byId('cp_inner_center'), 'first');
            // get layer by id
            this._impactLayer = this.getLayerByTitle(this.map, this.layers, this.config.impact_layer);
            if(this._impactLayer){
                this._selectedGraphics = new GraphicsLayer({
                    id: "selectedArea",
                    visible: this._impactLayer.visible
                });
                this.map.addLayer(this._selectedGraphics, (this._impactLayer.layerIndex + 1));
            }
            this._setValueRange();
            var q = new Query();
            q.where = '1=1';
            if(this._multiple){
                //q.where = '"' + this._attributeField + '" = (SELECT MAX("' + this._attributeField + '") FROM ' + this._impactLayer.id + ')';
                //console.log(q.where);
                // FIELD" = (SELECT MAX("FIELD") FROM layer)
                q.orderByFields = [this._attributeField + ' DESC'];   
            }
            if (this._impactLayer) {
                this._impactLayer.queryFeatures(q, lang.hitch(this, function (fs) {
                    if (fs.features.length) {
                        this._displayStats([fs.features[0]]);
                    }
                }));
                on(this._selectedGraphics, 'click', lang.hitch(this, function (evt) {
                    this._selectEvent(evt);
                }));
                on(this._impactLayer, 'click', lang.hitch(this, function (evt) {
                    this._selectEvent(evt);
                }));
                on(this._impactLayer, 'visibility-change', lang.hitch(this, function (evt) {
                    this._selectedGraphics.setVisibility(evt.visible);
                }));
            }
            this._setLeftPanelVisibility();
        },
        _clearSelected: function() {
            var items = query('.' + this.css.rendererSelected, dom.byId('renderer_menu'));
            var i;
            if (items && items.length) {
                for (i = 0; i < items.length; i++) {
                    domClass.remove(items[i], this.css.rendererSelected);
                }
            }
        },

        _hideLoadingIndicator: function () {
            domStyle.set(dom.byId("loadingIndicatorDiv"), "display", "none");
        },

        //create a map based on the input web map id
        _createWebMap: function() {
            // popup dijit
            var customPopup = new Popup({
            }, domConstruct.create("div"));
            domClass.add(customPopup.domNode, "calcite");
            //can be defined for the popup like modifying the highlight symbol, margin etc.
            arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                mapOptions: {
                    infoWindow: customPopup
                    //Optionally define additional map config here for example you can 
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more. 
                },
                bingMapsKey: this.config.bingmapskey
            }).then(lang.hitch(this, function(response) {
                //Once the map is created we get access to the response which provides important info 
                //such as the map, operational layers, popup info and more. This object will also contain
                //any custom options you defined for the template. In this example that is the 'theme' property.
                //Here' we'll use it to update the application to match the specified color theme.  
                //console.log(this.config);
                this.map = response.map;
                this.layers = response.itemInfo.itemData.operationalLayers;
                this._setTitle(response.itemInfo.item.title);
                this.item = response.itemInfo.item;

                console.log(this);

                if (this.map.loaded) {
                    this._init();
                } else {
                    on(this.map, 'load', lang.hitch(this, function() {
                        this._init();
                    }));
                }
            }), lang.hitch(this, function(error) {
                //an error occurred - notify the user. In this example we pull the string from the 
                //resource.js file located in the nls folder because we've set the application up 
                //for localization. If you don't need to support mulitple languages you can hardcode the 
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
