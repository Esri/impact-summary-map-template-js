define([
    "dojo/ready", 
    "dojo/_base/declare",
    "dojo/_base/lang",
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
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "application/Mustache",
    "dojo/text!views/panels.html",
    "dojo/text!views/renderer.html",
    "dojo/text!views/share.html",
    "dojo/text!views/about.html",
    "dojo/_base/event",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/fx",
    "dojo/fx/easing",
    "dojo/dom-geometry",
    "modules/LayerLegend",
    "esri/dijit/HomeButton",
    "esri/dijit/LocateButton",
    "esri/dijit/BasemapToggle",
    "dijit/Dialog"
],
function(
    ready, 
    declare,  
    lang,
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
    SimpleFillSymbol, SimpleLineSymbol,
    Color,
    Mustache,
    panelsView, rendererView, shareView, aboutView,
    event,
    Graphic, GraphicsLayer,
    BorderContainer, ContentPane,
    fx,
    easing,
    domGeom,
    LayerLegend,
    HomeButton, LocateButton, BasemapToggle,
    Dialog
) {
    return declare("", null, {
        config: {},
        constructor: function(config) {
            this._containers();
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information. 
            this.config = config;
            this._cssStyles();
            ready(lang.hitch(this, function() {
                this._setLanguageStrings();
                this._createWebMap();
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
                node.innerHTML = this.config.i18n.general.impact;
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
            this._appDialog();
            this._topButtons();
            this._drawer = cp_outer_left.domNode;
            this._drawerWidth = domGeom.getContentBox(this._drawer).w;
            this._drawerMenu();
        },
        _appDialog: function(){
            this._dialog = new Dialog({
                style: "width: 300px"
            }, domConstruct.create('div'));
            on(this._dialog, 'hide', lang.hitch(this, function(){
                if(this._lastActiveButton){
                    domClass.remove(this._lastActiveButton, this.css.toggleBlueOn);
                }
            }));
        },
        _toggleDialog: function(target, title, content){
            if(this._lastActiveButton){
                domClass.remove(this._lastActiveButton, this.css.toggleBlueOn);
            }
            if(this._dialog.get("open")){
                this._dialog.hide();
                domClass.remove(target, this.css.toggleBlueOn);
                this._lastActiveButton = null;
            }
            else{
                this._dialog.set("title", title);
                this._dialog.set("content", content);
                this._dialog.show();
                domClass.add(target, this.css.toggleBlueOn);
                this._lastActiveButton = target;
            }
        },
        _topButtons: function(){
            on(dom.byId('hamburger_button'), 'click', lang.hitch(this, function(evt) {
                this._toggleDrawer();
                domClass.toggle(evt.currentTarget, this.css.toggleBlueOn);
            }));
            on(dom.byId('share'), 'click', lang.hitch(this, function(evt) {
                var shareOutput = Mustache.render(shareView, {});
                this._toggleDialog(evt.currentTarget, this.config.i18n.general.share, shareOutput);
            }));
            on(dom.byId('about'), 'click', lang.hitch(this, function(evt) {
                var aboutOutput = Mustache.render(aboutView, {
                    item: this.item
                });
                this._toggleDialog(evt.currentTarget, this.config.i18n.general.about, aboutOutput);
            }));
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
                    onEnd: lang.hitch(this, function(){
                        domStyle.set(this._drawer, 'display', 'none');
                        this._bc_outer.layout();
                    })
                }).play();
            }
            else{
                domStyle.set(this._drawer, 'display', 'block');
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
            }
        },
        _displayStats: function(features) {
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
                var output = Mustache.render(panelsView, sum);
                this.dataNode.innerHTML = output;
                domStyle.set(this.dataNode, 'display', 'block');
                this._panelClick = on(query('.panel', this.dataNode), 'click', lang.hitch(this, function(evt) {
                    var target = evt.currentTarget;
                    var type = domAttr.get(target, 'data-type');
                    this._showExpanded(type);
                    event.stop(evt);
                }));
                this._expandedClick = on(query('.' + this.css.statsPanelSelected, this.dataNode), 'click', lang.hitch(this, function(evt) {
                    this._hideExpanded();
                    event.stop(evt);
                }));
                // add features to graphics layer
                this._selectedGraphics.clear();
                for (i = 0; i < features.length; i++) {
                    var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 255]), 2);
                    var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_FORWARD_DIAGONAL, sls, new Color([255, 255, 255, 0]));
                    var g = new Graphic(features[i].geometry, symbol, features[i].attributes, null);
                    if (g) {
                        this._selectedGraphics.add(g);
                    }
                }
            } else {
                domStyle.set(this.dataNode, 'display', 'none');
            }
        },
        _hideExpanded: function() {
            query('.' + this.css.statsPanelSelected, this.dataNode).style('display', 'none');
            query('.' + this.css.statsPanel, this.dataNode).style('display', 'inline-block');
        },
        _showExpanded: function(type) {
            query('.' + this.css.statsPanel, this.dataNode).style('display', 'none');
            query('.' + this.css.statsPanelSelected + '[data-type="' + type + '"]', this.dataNode).style('display', 'inline-block');
        },
        // get layer of impact area by layer title
        getLayerByTitle: function(map, layers, title) {
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (layer.title.toLowerCase() === title.toLowerCase()) {
                    return map.getLayer(layer.id);
                }
            }
            return false;
        },
        _setValueRange: function() {
            this._multiple = false;
            var renderer = this._impactLayer.renderer;
            this._attributeField = renderer.attributeField || this.config.impact_field;
            if(renderer){
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
            }
        },
        _selectEvent: function(evt) {
            if (evt.graphic) {
                this._clearSelected();
                this._displayStats([evt.graphic]);
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
            
            var LL = new LayerLegend({
                map: this.map,
                layers: this.layers
            }, "LayerLegend");
            LL.startup();
            
            /* Temporary until after 3.8 is released */
            var layers = this.map.getLayersVisibleAtScale(this.map.getScale());
            on.once(this.map, 'basemap-change', lang.hitch(this, function(){
                for(var i = 0; i < layers.length; i++){
                    if(layers[i]._basemapGalleryLayerType){
                        var layer = this.map.getLayer(layers[i].id);
                        this.map.removeLayer(layer);
                    }
                }
            }));
            /* END Temporary until after 3.8 is released */
            
            this.dataNode = domConstruct.place(domConstruct.create('div', {
                className: this.css.stats
            }), this.map._layersDiv, 'first');
            // get layer by id
            this._impactLayer = this.getLayerByTitle(this.map, this.layers, this.config.impact_layer);
            if(this._impactLayer){
                this._selectedGraphics = new GraphicsLayer({
                    id: "selectedArea",
                    visible: this._impactLayer.visible
                });
                this.map.addLayer(this._selectedGraphics);
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
            this._impactLayer.queryFeatures(q, lang.hitch(this, function(fs) {
                if (fs.features.length) {
                    this._displayStats([fs.features[0]]);
                }
            }));
            on(this._selectedGraphics, 'click', lang.hitch(this, function(evt) {
                this._selectEvent(evt);
            }));
            on(this._impactLayer, 'click', lang.hitch(this, function(evt) {
                this._selectEvent(evt);
            }));
            on(this._impactLayer, 'visibility-change', lang.hitch(this, function(evt) {
                this._selectedGraphics.setVisibility(evt.visible);
            }));
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
        //create a map based on the input web map id
        _createWebMap: function() {
            //can be defined for the popup like modifying the highlight symbol, margin etc.
            arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                mapOptions: {
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