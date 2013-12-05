define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    // load template
    "dojo/text!modules/dijit/templates/StatsBlock.html",
    "dojo/i18n!modules/nls/StatsBlock",
    "dojo/number",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "modules/StatSlider"
],
function (
    Evented,
    declare,
    lang, array,
    has, esriNS,
    _WidgetBase, _TemplatedMixin,
    on, query,
    topic,
    dijitTemplate, i18n,
    number,
    domConstruct, domClass, domStyle, domGeom,
    StatSlider
) {
    var Widget = declare([_WidgetBase, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.StatsBlock",
        templateString: dijitTemplate,
        options: {
            features: null,
            config: null,
            stats: null
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            this.set("features", defaults.features);
            this.set("config", defaults.config);
            this.set("stats", defaults.stats);
            this.watch("features", this._displayStats);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            // classes
            this.css = {
                menuPanel: 'panel',
                menuPanelSelected: 'panel-selected',
                stats: 'geoData',
                statsOpen: 'geoDataExpanded',
                statsPanel: 'panel',
                statsCount: 'count',
                statsPanelSelected: 'panel-expanded',
                statsPanelSelectedExpand: "panel-selected-expand",
                statsPanelDataBlock: 'data-block',
                statsPanelDataBlockLast: 'data-block-last',
                drawerOpen: "drawerOpen",
                animateSlider: "animateSlider",
                mobileSearchDisplay: "mobileLocateBoxDisplay",
                divOuterSliderContainer: "divOuterSliderContainer",
                divGeoDataHolder: "divGeoDataHolder",
                divHeaderClose: "divHeaderClose",
                divSliderContainer: "divSliderContainer"
            };
        },
        // bind listener for button to action
        //postCreate: function() {
        //    this.inherited(arguments);
        //},
        // start widget. called by user
        startup: function() {
            this._init();
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
            this._removeEvents();
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */
        
        resize: function(){
            if (this._displayedContainer) {
                this._setPanelWidth(this._displayedContainer);
            }
        },
        show: function(){
            domStyle.set(this._geoDataContainerNode, 'display', 'block');
        },
        hide: function(){
            domStyle.set(this._geoDataContainerNode, 'display', 'none');
        },
        
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _removeEvents: function() {
            if (this._events && this._events.length) {
                for (var i = 0; i < this._events.length; i++) {
                    this._events[i].remove();
                }
            }
            this._events = [];
        },
        _init: function() {
            // setup events
            this._removeEvents();
            this._displayStats();
            // ready
            this.set("loaded", true);
            this.emit("load", {});
        },
        _formatNumber: function(n, decPlaces) {
            // format large numbers
            decPlaces = Math.pow(10, decPlaces);
            var abbrev = ["k", "m", "b", "t"];
            for (var i = abbrev.length - 1; i >= 0; i--) {
                var size = Math.pow(10, (i + 1) * 3);
                if (size <= n) {
                    n = Math.round(n * decPlaces / size) / decPlaces;
                    if ((n === 1000) && (i < abbrev.length - 1)) {
                        n = 1;
                        i++;
                    }
                    n += abbrev[i];
                    break;
                }
            }
            return n;
        },
        _decPlaces: function(n){
        
            console.log(n);
        
            if(!n){
                n = 0;
            }
            var decPlaces;
            var nStr = n.toString();
            if (nStr.length >= 7) {
                decPlaces = 1;
            } else if (nStr.length >= 5) {
                decPlaces = 0;
            } else if (nStr.length === 4) {
                return number.format(n);
            } else {
                decPlaces = 2;
            }
            return this._formatNumber(n, decPlaces);  
        },
        _displayStats: function() {
            var features = this.get("features");
            if (features && features.length) {
                
                console.log('who');
                
                // all config to summarize
                var config = this.get("config");
                var stats = {};
                var i;
                // each feature
                for (i = 0; i < features.length; i++) {
                    // feature is zero
                    if (i === 0) {
                        // lets add 1st variable
                        for (var j = 0; j < config.length; j++) {
                            if (features[i].attributes.hasOwnProperty(config[j].attribute)) {
                                stats[config[j].attribute] = features[i].attributes[config[j].attribute];
                            }
                            for (var k = 0; k < config[j].children.length; k++) {
                                stats[config[j].children[k].attribute] = features[i].attributes[config[j].children[k].attribute];
                            }
                        }
                    } else {
                        // lets add each variable
                        for (var j = 0; j < config.length; j++) {
                            if (features[i].attributes.hasOwnProperty(config[j].attribute)) {
                                stats[config[j].attribute] += features[i].attributes[config[j].attribute];
                            }
                            for (var k = 0; k < config[j].children.length; k++) {
                                stats[config[j].children[k].attribute] += features[i].attributes[config[j].children[k].attribute];
                            }
                        }
                    }
                }
                
                console.log('what');
                
       
                
                
                
            
                this.set("stats", stats);
                this._createPanels();
                
                console.log(stats);
                
                
                // show geo stats
                this.show();
                
                console.log('ya');
                
                
                
                /*
                var panelType;
                // get selected panel
                if (this._displayedContainer) {
                    panelType = domAttr.get(this._displayedContainer, 'data-type');
                }
                */
  
                //Create Slider for Geo data panels
                var sliders, childNode, divGeoPanel;
                // todo
                sliders = query('.' + this.css.statsPanelSelected + ' .' + this.css.divOuterSliderContainer, this._geoDataContainerNode);
                // sliders
                if(sliders && sliders.length){
                    // each slider node
                    array.forEach(sliders, lang.hitch(this, function(node) {
                        divGeoPanel = query('.' + this.css.divGeoDataHolder, node)[0];
                        if(divGeoPanel){
                            childNode = query('.' + this.css.statsPanelDataBlock, divGeoPanel).length;
                            if (childNode > 3) {
                                if (divGeoPanel) {
                                    
                                    var tst = new StatSlider({
                                        content: divGeoPanel
                                    }, node);
                                    tst.startup();
                                    
                                }
                            }
                            // todo
                            var panels = query('.' + this.css.statsPanelDataBlock, divGeoPanel);
                            if(panels && panels.length){
                                // last item class
                                domClass.add(panels[panels.length - 1], this.css.statsPanelDataBlockLast);
                            }
                        }
                    }));
                }
                
                /*
                if (panelType) {
                    this._showExpanded(panelType);
                }
                */
                
                
                for(var i = 0; i < this._panelNodes.length; i++){
                    // panel click
                    this._panelClick = on(this._panelNodes[i], 'click', lang.hitch(this, function(evt) {
                        this._showExpanded(i);
                    }));
                }
                
                for(var i = 0; i < this._closePanelNodes.length; i++){
                    // expanded panel click
                    this._expandedClick = on(this._closePanelNodes[i], 'click', lang.hitch(this, function() {
                        this._hideExpanded();
                    }));    
                }
                
                
                
                console.log('boo');
                
                
                
            } else {
                this.hide();
            }
        },
        _createPanelNode: function(obj){
            var stats = this.get("stats");
            
            var container = domConstruct.create('div', {
                className: "panel " + obj.theme
            });
            
            var count = domConstruct.create('div', {
                className:"count",
                innerHTML: this._decPlaces(stats[obj.attribute])
            });
            domConstruct.place(count, container, 'last');
            this._countNodes.push(count);
            
            
            var title = domConstruct.create('div', {
                className:"title",
                innerHTML: obj.label
            });
            domConstruct.place(title, container, 'last');
            
            return container;
            
        },
        _createExpandedPanelNode: function(obj){
            var stats = this.get("stats");
            
            var container = domConstruct.create('div', {
                className: "panel-expanded " + obj.theme
            });
            
            // header
            var header = domConstruct.create('div', {
                className:"divHeader"
            });
            domConstruct.place(header, container, 'last');
            
            var headerTitle = domConstruct.create('div', {
                className:"bgColor divHeaderTitle"
            });
            domConstruct.place(headerTitle, header, 'last');
            
            var headerSpanTitle = domConstruct.create('span', {
                className:"hTitle",
                innerHTML:obj.label
            });
            domConstruct.place(headerSpanTitle, headerTitle, 'last');
            
            var headerSpanNumber = domConstruct.create('span', {
                className:"hNumber",
                innerHTML: this._decPlaces(stats[obj.attribute])
            });
            domConstruct.place(headerSpanNumber, headerTitle, 'last');
            
            var headerClose = domConstruct.create('div', {
                className:"divHeaderClose icon-cancel-1",
                title: "close"
            });
            domConstruct.place(headerClose, header, 'last');
            
            this._closePanelNodes.push(headerClose);
            
            
            var headerClear = domConstruct.create('div', {
                className:"clear"
            });
            domConstruct.place(headerClear, header, 'last');
            
            
            
            var sliderContainer = domConstruct.create('div', {
                className:"divOuterSliderContainer"
            });
            domConstruct.place(sliderContainer, container, 'last');
            
            var sliderDataHolder = domConstruct.create('div', {
                className:"divGeoDataHolder"
            });
            domConstruct.place(sliderDataHolder, sliderContainer, 'last');
            
            
            if(obj.children && obj.children.length){
                for(var i = 0; i < obj.children.length; i++){
                    
                    console.log(obj);
                    
                    var dataBlock = this._createPanelBlockNodes(obj.children[i]);
                    
                    console.log(dataBlock);
                    
                    domConstruct.place(dataBlock, sliderDataHolder, 'last');
                }
            }
            var clearBlocks = domConstruct.create('div', {
                className:"clear"
            });
            domConstruct.place(clearBlocks, sliderDataHolder, 'last');

            
            var sliderDataSource = domConstruct.create('div', {
                className:"dataSourceUrl"
            });
            domConstruct.place(sliderDataSource, sliderContainer, 'last');
            
            console.log(sliderDataSource);
            
            var sliderDataSourceAnchor = domConstruct.create('a', {
                innerHTML:"source",
                href: obj.dataSourceUrl,
                target:"_blank"
            });
            domConstruct.place(sliderDataSourceAnchor, sliderDataSource, 'last');
            
            
            return container;
        },
        _createPanelBlockNodes: function(obj){
            var stats = this.get("stats");
            
            var container = domConstruct.create('div', {
                className: "data-block"
            });
            
            var count = domConstruct.create('div', {
                className:"count",
                innerHTML: this._decPlaces(stats[obj.attribute])
            });
            domConstruct.place(count, container, 'last');
            
            var title = domConstruct.create('div', {
                className:"title",
                title: obj.label,
                innerHTML: obj.label
            });
            domConstruct.place(title, container, 'last');
            
            return container;
        },
        _createPanels: function(){
            var config = this.get("config");
            
            this._geoPanelsNode.innerHTML = '';
            this._geoDataPanelsExpandedNode.innerHTML = '';
            
            
            var themes = ['theme_1','theme_2','theme_3','theme_4'];
            
            this._panelNodes = [];
            this._panelExpandedNodes = [];
            this._closePanelNodes = [];
            this._countNodes = [];
            
            for(var i = 0; i < config.length && i < themes.length; i++){
            
                config[i].theme = themes[i];
                
                var panelNode = this._createPanelNode(config[i]);
                domConstruct.place(panelNode, this._geoPanelsNode, 'last');
                this._panelNodes.push(panelNode);
                
                
                var panelExpandedNode = this._createExpandedPanelNode(config[i]);
                domConstruct.place(panelExpandedNode, this._geoDataPanelsExpandedNode, 'last');
                this._panelExpandedNodes.push(panelExpandedNode);
                
                
                
                
            }
            var clear = domConstruct.create('div', {
                className:"clear"
            });
            domConstruct.place(clear, this._geoPanelsNode, 'last');
            
            var clear2 = domConstruct.create('div', {
                className:"clear"
            });
            domConstruct.place(clear2, this._geoDataPanelsExpandedNode, 'last');
            
        },
        _setPanelWidth: function(node) {
            // todo
            // need to do this on window resize
            if (node) {
                // todo get content box?
                var mb = domGeom.getMarginBox(this._geoPanelsNode);
                var sliderWidth = mb.w;
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
        _hideExpanded: function() {
            domClass.remove(this.domNode, this.css.statsOpen);
            // todo
            var divCount = query('.' + this.css.statsPanel + ' .' + this.css.statsCount, this._geoPanelsNode);
            //hide slider
            this._hideContainer();
            //display geo-data count panels
            array.forEach(divCount, function(elementCount) {
                domStyle.set(elementCount, 'display', 'block');
            });
            // todo
            var items = query('.' + this.css.menuPanel, this.domNode);
            array.forEach(items, lang.hitch(this, function(elementCount) {
                domClass.remove(elementCount, this.css.statsPanelSelectedExpand);
            }));
        },
        _showExpanded: function(index) {
            
            domClass.add(this.domNode, this.css.statsOpen);
            
            // todo
            var sliders, domSlider, divCount;

                domSlider = this._panelExpandedNodes[index];
                this._currentPanelSlider = domSlider;
                
   
        
                    array.forEach(this._panelExpandedNodes, lang.hitch(this, function(e) {
                        //domStyle.set(elementCount, 'display', 'none');
                        domClass.remove(e, this.css.animateSlider);
                    }));
                    
    
                    array.forEach(this._panelNodes, lang.hitch(this, function(elementCount) {
                        domClass.remove(elementCount, this.css.statsPanelSelectedExpand);
                    }));
                    
                    
                    //display slider
                    this._displayContainer(domSlider);
                    //hide geo-data count panels.
                    array.forEach(this._countNodes, function(elementCount) {
                        domStyle.set(elementCount, 'display', 'none');
                    });
                    this._setPanelWidth(domSlider);
                    
                    
                    domClass.add(domSlider, this.css.statsPanelSelectedExpand);

        },
        _displayContainer: function(node) {
            // show panel
            domClass.add(node, this.css.animateSlider);
            // set currenlty displayed container
            this._displayedContainer = node;
        },
        _hideContainer: function() {
            if(this._currentPanelSlider){
                domClass.remove(this._currentPanelSlider, this.css.animateSlider);
            }
            this._displayedContainer = null;
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.StatsBlock", Widget, esriNS);
    }
    return Widget;
});
