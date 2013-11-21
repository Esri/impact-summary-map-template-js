define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "esri/arcgis/utils",
    "esri/graphicsUtils",
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/on",
    "dojo/topic",
    "dojo/number",
    "dojo/dom-style",
    "dojo/dom-attr",
    "esri/tasks/query",
    "dojo/dom-class",
    "dojo/query",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "application/Mustache",
    "dojo/text!views/panels.html",
    "dojo/text!views/renderer.html",
    "dojo/_base/event",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/fx",
    "dojo/fx/easing",
    "modules/LayerLegend",
    "modules/AboutDialog",
    "modules/ShareDialog",
    "esri/dijit/HomeButton",
    "esri/dijit/LocateButton",
    "esri/dijit/BasemapToggle",
    "esri/dijit/Geocoder",
    "modules/Slider",
    "esri/dijit/Popup",
    "dojo/Deferred"
],
function(
    ready,
    declare,
    lang,
    array,
    arcgisUtils,
    graphicsUtils,
    domConstruct,
    dom,
    on,
    topic,
    number,
    domStyle,
    domAttr,
    Query,
    domClass,
    query,
    SimpleFillSymbol, SimpleLineSymbol,
    Color,
    Mustache,
    panelsView, rendererView,
    event,
    Graphic, GraphicsLayer,
    BorderContainer, ContentPane,
    fx,
    easing,
    LayerLegend, AboutDialog, ShareDialog,
    HomeButton, LocateButton, BasemapToggle,
    Geocoder,
    Slider,
    Popup,
    Deferred
) {
    return declare("", null, {
        config: {},
        constructor: function(config) {
            // css classes
            this.css = {
                toggleBlue: 'toggle-grey',
                toggleBlueOn: 'toggle-grey-on',
                menuItem: 'item',
                menuItemSelected: 'item-selected',
                menuItemFirst: "item-first",
                menuItemOnly: "only-item",
                menuPanel: 'panel',
                menuPanelSelected: 'panel-selected',
                rendererMenu: 'menuList',
                rendererMenuItem: 'item',
                rendererSelected: 'selected',
                rendererLoading: 'loadingFeatures',
                rendererContainer: 'item-container',
                rendererSummarize: 'summarize',
                stats: 'geoData',
                statsPanel: 'panel',
                statsCount: 'count',
                statsPanelSelected: 'panel-expanded',
                statsPanelSelectedExpand: "panel-selected-expand",
                statsPanelDataBlock: 'data-block',
                drawerOpen: "drawerOpen",
                animateSlider: "animateSlider",
                mobileSearchDisplay: "mobileLocateBoxDisplay",
                divOuterSliderContainer: "divOuterSliderContainer",
                divGeoDataHolder: "divGeoDataHolder",
                divHeaderClose: "divHeaderClose",
                divSliderContainer: "divSliderContainer"
            };
            this._mobileSizeStart = 850;
            // set up border containers
            this._containers();
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            this.config = config;
            // dom ready
            ready(lang.hitch(this, function() {
                // set panel names
                this._setLanguageStrings();
                // lets get that webmap
                this._createWebMap();
            }));
        },
        _setLanguageStrings: function() {
            var node;
            // legend menu button node
            node = dom.byId('legend_name');
            if (node) {
                node.innerHTML = this.config.i18n.general.legend;
            }
            // impact menu button node
            node = dom.byId('impact_name');
            if (node) {
                node.innerHTML = this.config.i18n.general.impact;
            }
        },
        _containers: function() {
            // outer container
            this._bc_outer = new BorderContainer({
                gutters: false
            }, dom.byId('bc_outer'));
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
            // start border container
            this._bc_outer.startup();
            // drawer button
            on(dom.byId('hamburger_button'), 'click', lang.hitch(this, function() {
                this._toggleDrawer();
            }));
            // drawer node
            this._drawer = cp_outer_left.domNode;
            // drawer width
            this._drawerWidth = domStyle.get(this._drawer, 'width');
            // set drawer menu
            this._drawerMenu();
        },
        _showDrawerPanel: function(buttonNode) {
            // menu items
            var menus = query('.' + this.css.menuItemSelected, dom.byId('drawer_menu'));
            // panel items
            var panels = query('.' + this.css.menuPanelSelected, dom.byId('drawer_panels'));
            var i;
            // remove all selected menu items
            for (i = 0; i < menus.length; i++) {
                domClass.remove(menus[i], this.css.menuItemSelected);
            }
            // remove all selected panels
            for (i = 0; i < panels.length; i++) {
                domClass.remove(panels[i], this.css.menuPanelSelected);
            }
            // get menu to show
            var menu = domAttr.get(buttonNode, 'data-menu');
            // set menu button selected
            domClass.add(buttonNode, this.css.menuItemSelected);
            // set menu selected
            domClass.add(menu, this.css.menuPanelSelected);
        },
        _drawerMenu: function() {
            // all menu items
            var menus = query('.' + this.css.menuItem, dom.byId('drawer_menu'));
            // menu item click
            on(menus, 'click', lang.hitch(this, function(evt) {
                // show drawer panel
                this._showDrawerPanel(evt.currentTarget);
            }));
        },
        _setTitle: function(title) {
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
        _toggleDrawer: function() {
            var def = new Deferred();
            // if drawer is shown
            if (domStyle.get(this._drawer, 'display') === 'block') {
                // remove class
                domClass.remove(document.body, this.css.drawerOpen);
                // collapse width
                fx.animateProperty({
                    node: this._drawer,
                    properties: {
                        width: {
                            start: this._drawerWidth,
                            end: 0
                        }
                    },
                    duration: 250,
                    easing: easing.expoOut,
                    onAnimate: lang.hitch(this, function() {
                        // render border container
                        this._fixLayout();
                    }),
                    onEnd: lang.hitch(this, function() {
                        // hide drawer
                        domStyle.set(this._drawer, 'display', 'none');
                        // check if drawer is open
                        this._drawerOpenClass();
                        // render border container
                        this._fixLayout();
                        // set panel width for displayed container
                        if (this._displayedContainer) {
                            this._setPanelWidth(this._displayedContainer);
                        }
                        // show mobile button
                        this._checkMobileGeocoderVisibility();
                        // hamburger button status
                        this._toggleHamburgerButton();
                        def.resolve();
                    })
                }).play();
            } else {
                // show drawer
                domStyle.set(this._drawer, 'display', 'block');
                // expand width
                fx.animateProperty({
                    node: this._drawer,
                    properties: {
                        width: {
                            start: 0,
                            end: this._drawerWidth
                        }
                    },
                    duration: 250,
                    easing: easing.expoOut,
                    onAnimate: lang.hitch(this, function() {
                        // render border container
                        this._fixLayout();
                    }),
                    onEnd: lang.hitch(this, function() {
                        // render border container
                        this._fixLayout();
                        // if mobile size
                        if (window.innerWidth < this._mobileSizeStart) {
                            // get selected slider
                            if (this._displayedContainer) {
                                this._setPanelWidth(this._displayedContainer);
                            }
                        }
                        // hamburger button status
                        this._toggleHamburgerButton();
                        // check if drawer is open
                        this._drawerOpenClass();
                        def.resolve();
                    })
                }).play();
            }
            return def.promise;
        },
        _toggleHamburgerButton: function() {
            // hamburger node
            var hbNode = dom.byId('hamburger_button');
            // if drawer is displayed
            if (domStyle.get(this._drawer, 'display') === 'block') {
                // has normal class
                if (domClass.contains(hbNode, this.css.toggleBlue)) {
                    // replace with selected class
                    domClass.replace(hbNode, this.css.toggleBlueOn, this.css.toggleBlue);
                }
            } else {
                // has selected class
                if (domClass.contains(hbNode, this.css.toggleBlueOn)) {
                    // replace with normal class
                    domClass.replace(hbNode, this.css.toggleBlue, this.css.toggleBlueOn);
                }
            }
        },
        _displayContainer: function(node) {
            // show panel
            domStyle.set(node, 'display', 'block');
            // todo
            setTimeout(lang.hitch(this, function() {
                domClass.add(node, this.css.animateSlider);
            }), 0);
            // set currenlty displayed container
            this._displayedContainer = node;
        },
        _hideContainer: function(node) {
            // todo
            setTimeout(lang.hitch(this, function() {
                domClass.remove(node, this.css.animateSlider);
            }), 0);
            domStyle.set(node, 'display', 'none');
        },
        _formatNumber: function(number, decPlaces) {
            decPlaces = Math.pow(10, decPlaces);
            var abbrev = ["k", "m", "b", "t"];
            for (var i = abbrev.length - 1; i >= 0; i--) {
                var size = Math.pow(10, (i + 1) * 3);
                if (size <= number) {
                    number = Math.round(number * decPlaces / size) / decPlaces;
                    if ((number === 1000) && (i < abbrev.length - 1)) {
                        number = 1;
                        i++;
                    }
                    number += abbrev[i];
                    break;
                }
            }
            return number;
        },
        _displayStats: function(features) {
            var decPlaces;
            if (features && features.length) {
                var variables = this.config.sum_variables;
                var sum = {};
                var i;
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
                sum.numFormat = lang.hitch(this, function() {
                    return lang.hitch(this, function(text, render) {
                        var renderedText = render(text);
                        if (renderedText.length >= 7) {
                            decPlaces = 1;
                        } else if (renderedText.length >= 5) {
                            decPlaces = 0;
                        } else if (renderedText.length === 4) {
                            return number.format(parseInt(renderedText, 10));
                        } else {
                            decPlaces = 2;
                        }
                        return this._formatNumber(parseInt(renderedText, 10), decPlaces);
                    });
                });
                // show geo stats
                domStyle.set(this.dataNode, 'display', 'block');
                // render html panels
                var output = Mustache.render(panelsView, sum);
                var selectedPanel, panelType;
                // get selected panel
                if (this._displayedContainer) {
                    panelType = domAttr.get(this._displayedContainer, 'data-type');
                }
                // set panel html
                this.dataNode.innerHTML = output;
                // remove exiting slider events
                this._removeSliderEvents();
                //Create Slider for Geo data panels
                var sliders, objSlider, childNode, divGeoPanel, sliderResizeHandler = null;
                // todo
                sliders = query('.' + this.css.statsPanelSelected + ' .' + this.css.divOuterSliderContainer, dom.byId('geodata_container'));
                
                if(sliders && sliders.length){
                    // each slider node
                    array.forEach(sliders, lang.hitch(this, function(node) {
                        divGeoPanel = query('.' + this.css.divGeoDataHolder, node)[0];
                        
                        if(divGeoPanel){
                            childNode = query('.' + this.css.statsPanelDataBlock, divGeoPanel).length;
                            this._setPanelWidth(node.parentElement);
                            if (childNode > 3) {
                                if (divGeoPanel) {
                                    objSlider = new Slider({
                                        sliderContent: divGeoPanel,
                                        sliderParent: node
                                    });
                                }
                            }
                            if (!sliderResizeHandler) {
                                //set slider position on window resize
                                sliderResizeHandler = on(window, 'resize', lang.hitch(this, function() {
                                    this._setLeftPanelVisibility();
                                    setTimeout(lang.hitch(this, function() {
                                        array.forEach(sliders, lang.hitch(this, function(sliderNode) {
                                            this._setPanelWidth(sliderNode.parentElement);
                                        }));
                                    }), 100);
                                }));
                                this._sliderEvents.push(sliderResizeHandler);
                            }
                            var panels = query('.' + this.css.statsPanelDataBlock + ':last-child', divGeoPanel);
                            if(panels && panels.length){
                                for(i = 0; i < panels.length; i++){
                                    domStyle.set(panels[i], 'border', 'none');
                                }
                            }
                        }
                    }));
                }
                if (panelType) {
                    this._showExpanded(panelType);
                }
                // panel click
                this._panelClick = on(query('.' + this.css.menuPanel, this.dataNode), 'click', lang.hitch(this, function(evt) {
                    var type = domAttr.get(evt.currentTarget, 'data-type');
                    this._showExpanded(type);
                }));
                // expanded panel click
                this._expandedClick = on(query('.' + this.css.statsPanelSelected + ' .' + this.css.divHeaderClose, this.dataNode), 'click', lang.hitch(this, function(evt) {
                    this._hideExpanded(evt.currentTarget);
                }));
                // add features to graphics layer
                this._selectedGraphics.clear();
                // each selected feature
                for (i = 0; i < features.length; i++) {
                    var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 1]), 2);
                    var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, sls, new Color([0, 255, 255, 0]));
                    var g = new Graphic(features[i].geometry, symbol, features[i].attributes, null);
                    if (g) {
                        this._selectedGraphics.add(g);
                    }
                }
            } else {
                // hide geo stats
                domStyle.set(this.dataNode, 'display', 'none');
            }
        },
        _removeSliderEvents: function() {
            if (this._sliderEvents && this._sliderEvents.length) {
                for (var i = 0; i < this._sliderEvents.length; i++) {
                    this._sliderEvents[i].remove();
                }
            }
            this._sliderEvents = [];
        },
        _setPanelWidth: function(node) {
            if (node) {
                var sliderWidth = dom.byId('geo_panel').offsetWidth;
                domStyle.set(node, 'width', sliderWidth + 'px');
                this._resizeGeoContainer(node);
            }
        },
        _resizeGeoContainer: function(node) {
            // todo
            var slider = query('.' + this.css.divSliderContainer, node)[0];
            if (slider) {
                topic.publish("resizeGeoDataSlider", slider.id);
            }
        },
        _setLeftPanelVisibility: function() {
            // geo stats container
            var gdContainer = dom.byId('geodata_container');
            if (gdContainer) {
                // show stats
                domStyle.set(gdContainer, 'display', 'inline-block');
            }
            // mobile size
            if (window.innerWidth < this._mobileSizeStart) {
                // if drawer is shown
                if (domStyle.get(this._drawer, 'display') === 'block') {
                    // hide drawer
                    domStyle.set(this._drawer, 'display', 'none');
                    // set mobile geocoder
                    this._checkMobileGeocoderVisibility();
                }
            } else {
                // set mobile geocoder
                this._checkMobileGeocoderVisibility();
                // drawer not shown
                if (domStyle.get(this._drawer, 'display') === 'none') {
                    // show drawer
                    this._toggleDrawer();
                }
            }
            // check if drawer is open
            this._drawerOpenClass();
            // hamburger button stats
            this._toggleHamburgerButton();
            // fix border container layout
            this._fixLayout();
        },
        _drawerOpenClass: function() {
            if (domStyle.get(this._drawer, 'display') === 'block') {
                domClass.add(document.body, this.css.drawerOpen);
            } else {
                domClass.remove(document.body, this.css.drawerOpen);
            }
        },
        _checkMobileGeocoderVisibility: function() {
            if (domClass.contains(dom.byId("mobileGeocoderIcon"), this.css.toggleBlueOn)) {
                domClass.add(dom.byId("mobileSearch"), this.css.mobileSearchDisplay);
            }
        },
        _hideExpanded: function(element) {
            var domSlider, divCount;
            // todo
            domSlider = element.parentElement.parentElement;
            // todo
            divCount = query('.' + this.css.statsPanel + ' .' + this.css.statsCount, dom.byId('geo_panel'));
            //hide slider
            this._hideContainer(domSlider, 100);
            //display geo-data count panels
            array.forEach(divCount, function(elementCount) {
                domStyle.set(elementCount, 'display', 'block');
            });
            // todo
            var items = query('.' + this.css.menuPanel, this.dataNode);
            array.forEach(items, lang.hitch(this, function(elementCount) {
                domClass.remove(elementCount, this.css.statsPanelSelectedExpand);
            }));
        },
        _showExpanded: function(type) {
            // todo
            var sliders, domSlider, divCount;
            sliders = query('.' + this.css.statsPanelSelected + '[data-type="' + type + '"]', this.dataNode);
            if(sliders && sliders.length){
                domSlider = sliders[0];
                if (domStyle.get(domSlider, 'display') === 'none') {
                    var panels = query('.' + this.css.statsPanelSelected, this.dataNode); 
                    array.forEach(panels, lang.hitch(this, function(elementCount) {
                        domStyle.set(elementCount, 'display', 'none');
                        domClass.remove(elementCount, this.css.animateSlider);
                    }));
                    var items = query('.' + this.css.menuPanel, this.dataNode);
                    array.forEach(items, lang.hitch(this, function(elementCount) {
                        domClass.remove(elementCount, this.css.statsPanelSelectedExpand);
                    }));
                    divCount = query('.' + this.css.statsPanel + ' .' + this.css.statsCount, this.dataNode);
                    //display slider
                    this._displayContainer(domSlider);
                    //hide geo-data count panels.
                    array.forEach(divCount, function(elementCount) {
                        domStyle.set(elementCount, 'display', 'none');
                    });
                    this._setPanelWidth(domSlider);
                    var selected = query('.' + this.css.menuPanel + '[data-type="' + type + '"]', this.dataNode)[0];
                    domClass.add(selected, this.css.statsPanelSelectedExpand);
                }
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
        _queryFeatures: function(node){
            // show layer if invisible
            if (!this._impactLayer.visible) {
                this._impactLayer.setVisibility(true);
            }
            // remove any selected
            this._clearSelected();
            var value = domAttr.get(node, 'data-value');
            domClass.add(node, this.css.rendererSelected);
            domClass.add(node, this.css.rendererLoading);
            // search query
            var q = new Query();
            if(value === "summarize" || value === ""){
                q.where = '1 = 1';
            }
            else{
                // match value
                if (isNaN(value)) {
                    q.where = this._attributeField + ' = ' + "'" + value + "'";
                } else {
                    q.where = this._attributeField + ' = ' + value;
                }
            }
            var ct = node;
            // query features
            this._impactLayer.queryFeatures(q, lang.hitch(this, function(fs) {
                domClass.remove(ct, this.css.rendererLoading);
                this._displayStats(fs.features);
                this.map.setExtent(graphicsUtils.graphicsExtent(fs.features), true);
            }), lang.hitch(this, function() {
                // remove selected
                this._clearSelected();
            }));
        },
        // determines to show renderer if multiple features
        _setValueRange: function() {
            // default not multiple
            this._multiple = false;
            // layer renderer
            var renderer = this._impactLayer.renderer;
            // attribute info
            this._attributeField = renderer ? renderer.attributeField : this.config.impact_field;
            // renderer exists
            if (renderer) {
                // renderer layer infos
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
                    // render mustache html
                    var output = Mustache.render(rendererView, data);
                    if (output) {
                        // set html
                        dom.byId('renderer_menu').innerHTML = output;
                        // display renderer
                        domStyle.set(dom.byId('renderer_menu'), 'display', 'block');
                        // renderer item click
                        on(query('.' + this.css.rendererMenuItem, dom.byId('renderer_menu')), 'click', lang.hitch(this, function(evt) {
                            var ct = evt.currentTarget;
                            // current renderer isn't already selected
                            if(!domClass.contains(ct, this.css.rendererSelected)){
                                // hide drawer for small res
                                if (window.innerWidth < this._mobileSizeStart) {
                                    this._toggleDrawer().then(lang.hitch(this, function(){
                                        this.map.resize();
                                        setTimeout(lang.hitch(this, function() {
                                            this._queryFeatures(ct);
                                        }), 250);
                                    }));
                                }
                                else{
                                    this._queryFeatures(ct);
                                }
                            }
                        }));
                    }
                } else {
                    this._hideImpactArea();
                }
            } else {
                this._hideImpactArea();
            }
        },
        _hideImpactArea: function() {
            domStyle.set(dom.byId("impact_content"), "display", "none");
            domClass.add(dom.byId("legend_content"), this.css.menuItemOnly);
            domClass.remove(dom.byId("legend_name"), this.css.menuItemFirst);
        },
        _selectEvent: function(evt) {
            // graphic selected
            if (evt.graphic) {
                this._clearSelected();
                this._displayStats([evt.graphic]);
                event.stop(evt);
            }
        },
        _showMobileGeocoder: function() {
            domClass.add(dom.byId("mobileSearch"), this.css.mobileSearchDisplay);
            domClass.replace(dom.byId("mobileGeocoderIconContainer"), this.css.toggleBlueOn, this.css.toggleBlue);
        },
        _hideMobileGeocoder: function() {
            domClass.remove(dom.byId("mobileSearch"), this.css.mobileSearchDisplay);
            domStyle.set(dom.byId("mobileSearch"), "display", "none");
            domClass.replace(dom.byId("mobileGeocoderIconContainer"), this.css.toggleBlue, this.css.toggleBlueOn);
        },
        _init: function() {
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
                defaultBasemap: "topo",
                theme: "BasemapToggleCalcite"
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
            // toc
            var LL = new LayerLegend({
                map: this.map,
                layers: this.layers
            }, "LayerLegend");
            LL.startup();
            // geocoders
            this._createGeocoders();
            // mobile geocoder toggle            
            var mobileIcon = dom.byId("mobileGeocoderIcon");
            if (mobileIcon) {
                on(mobileIcon, "click", lang.hitch(this, function() {
                    if (domStyle.get(dom.byId("mobileSearch"), "display") === "none") {
                        this._showMobileGeocoder();
                    } else {
                        this._hideMobileGeocoder();
                    }
                }));
            }
            // cancel mobile geocoder
            on(dom.byId("btnCloseGeocoder"), "click", lang.hitch(this, function() {
                this._hideMobileGeocoder();
            }));
            // todo
            /* Start temporary until after JSAPI 3.8 is released */
            var layers = this.map.getLayersVisibleAtScale(this.map.getScale());
            on.once(this.map, 'basemap-change', lang.hitch(this, function() {
                for (var i = 0; i < layers.length; i++) {
                    if (layers[i]._basemapGalleryLayerType) {
                        var layer = this.map.getLayer(layers[i].id);
                        this.map.removeLayer(layer);
                    }
                }
            }));
            // todo
            /* END temporary until after JSAPI 3.8 is released */
            this.dataNode = domConstruct.place(domConstruct.create('div', {
                className: this.css.stats
            }), dom.byId('cp_outer_center'), 'first');
            // get layer by id
            this._impactLayer = this.getLayerByTitle(this.map, this.layers, this.config.impact_layer);
            if (this._impactLayer) {
                // selected graphics layer
                this._selectedGraphics = new GraphicsLayer({
                    id: "selectedArea",
                    visible: this._impactLayer.visible
                });
                this.map.addLayer(this._selectedGraphics, (this._impactLayer.layerIndex + 1));
            }
            // set renderer stuff
            this._setValueRange();
            // features query
            var q = new Query();
            q.where = '1=1';
            // if multiple features. (determined by renderer)
            if (this._multiple) {
                // order by attribute field
                q.orderByFields = [this._attributeField + ' DESC'];
            }
            // if impact layer exists
            if (this._impactLayer) {
                // get impact features
                this._impactLayer.queryFeatures(q, lang.hitch(this, function(fs) {
                    // features were returned
                    if (fs.features && fs.features.length) {
                        // display stats
                        this._displayStats([fs.features[0]]);
                    }
                }));
                // selected poly from graphics layer
                on(this._selectedGraphics, 'click', lang.hitch(this, function(evt) {
                    this._selectEvent(evt);
                }));
                // selected poly from impact layer
                on(this._impactLayer, 'click', lang.hitch(this, function(evt) {
                    this._selectEvent(evt);
                }));
                // impact layer show/hide
                on(this._impactLayer, 'visibility-change', lang.hitch(this, function(evt) {
                    // set visibility of graphics layer
                    this._selectedGraphics.setVisibility(evt.visible);
                    // if not visible
                    if (!evt.visible) {
                        // hide stats
                        domStyle.set(dom.byId('geodata_container'), 'display', 'none');
                    } else {
                        // show stats
                        domStyle.set(dom.byId('geodata_container'), 'display', 'inline-block');
                    }
                }));
            }
            // set drawer visibility
            this._setLeftPanelVisibility();
            // display menu panel for drawer
            this._displayMenu();
        },
        // display menu panel for drawer
        _displayMenu: function() {
            // hide loader
            this._hideLoadingIndicator();
            // get  menu
            var defaultMenu = query('.' + this.css.menuItem, dom.byId('drawer_menu'));
            if (defaultMenu) {
                // panel config set
                if (this.config.defaultPanel){
                    // panel found
                    var found = false;
                    // each menu item
                    for(var i = 0; i < defaultMenu.length; i++){
                        // get panel attribute
                        var panelId = domAttr.get(defaultMenu[i], 'data-menu');
                        if(panelId === this.config.defaultPanel){
                            this._showDrawerPanel(defaultMenu[i]);
                            // panel found
                            found = true;
                            break;
                        }
                    }
                    // panel not found
                    if(!found){
                        // show first panel
                        this._showDrawerPanel(defaultMenu[0]);
                    }
                }
                else{
                    // panel config not set. show first
                    this._showDrawerPanel(defaultMenu[0]);
                }
            }
        },
        // create geocoder widgets
        _createGeocoders: function() {
            this._geocoder = new Geocoder({
                map: this.map,
                theme: 'calite',
                autoComplete: true
            }, dom.byId("geocoderSearch"));
            this._geocoder.startup();
            // geocoder results
            on(this._geocoder, 'find-results', lang.hitch(this, function(response) {
                if (!response.results.length) {
                    console.log(this.config.i18n.general.noSearchResult);
                }
            }));
            this._mobileGeocoder = new Geocoder({
                map: this.map,
                theme: 'calite',
                autoComplete: true
            }, dom.byId("geocoderMobile"));
            this._mobileGeocoder.startup();
            // geocoder results
            on(this._mobileGeocoder, 'find-results', lang.hitch(this, function(response) {
                if (!response.results.length) {
                    console.log(this.config.i18n.general.noSearchResult);
                }
                this._hideMobileGeocoder();
            }));
            // keep geocoder values in sync
            this._geocoder.watch("value", lang.hitch(this, function(name, oldValue, value){
                this._mobileGeocoder.set("value", value);
            }));
            // keep geocoder values in sync
            this._mobileGeocoder.watch("value", lang.hitch(this, function(name, oldValue, value){
                this._geocoder.set("value", value);
            }));
        },
        // clear selected renderer & loading status
        _clearSelected: function() {
            // get all renderer items
            var items = query('.' + this.css.rendererMenuItem, dom.byId('renderer_menu'));
            // if items are there
            if (items && items.length) {
                // remove classes from each item
                for (var i = 0; i < items.length; i++) {
                    domClass.remove(items[i], this.css.rendererSelected);
                    domClass.remove(items[i], this.css.rendererLoading);
                }
            }
        },
        // hide map loading spinner
        _hideLoadingIndicator: function() {
            var indicator = dom.byId("loadingIndicatorDiv");
            if (indicator) {
                domStyle.set(indicator, "display", "none");
            }            
        },
        // resize border container layout
        _fixLayout: function() {
            this._bc_outer.layout();
        },
        //create a map based on the input web map id
        _createWebMap: function() {
            this._fixLayout();
            // popup dijit
            var customPopup = new Popup({}, domConstruct.create("div"));
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
                this.map = response.map;
                this.layers = response.itemInfo.itemData.operationalLayers;
                this._setTitle(response.itemInfo.item.title);
                this.item = response.itemInfo.item;
                if (this.map.loaded) {
                    this._init();
                } else {
                    on.once(this.map, 'load', lang.hitch(this, function() {
                        this._init();
                    }));
                }
            }), lang.hitch(this, function(error) {
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