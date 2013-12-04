define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/a11yclick",
    "dijit/_TemplatedMixin",
    "dojo/on",
    "dojo/query",
    "dojo/topic",
    // load template
    "dojo/text!modules/dijit/templates/StatsBlock.html",
    "dojo/i18n!modules/nls/StatsBlock",
    "dojo/number",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-geometry",
    "modules/StatSlider"
],
function (
    Evented,
    declare,
    lang, array,
    has, esriNS,
    _WidgetBase, a11yclick, _TemplatedMixin,
    on, query,
    topic,
    dijitTemplate, i18n,
    number,
    dom, domClass, domStyle, domAttr, domGeom,
    StatSlider
) {
    var Widget = declare([_WidgetBase, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.StatsBlock",
        templateString: dijitTemplate,
        options: {
            features: null,
            variables: null,
            dataSourceUrl: null,
            stats: null
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            this.set("features", defaults.features);
            this.set("variables", defaults.variables);
            this.set("dataSourceUrl", defaults.dataSourceUrl);
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
        _formatNumber: function(number, decPlaces) {
            // format large numbers
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
        _decPlaces: function(n){
            var decPlaces;
            if (n.length >= 7) {
                decPlaces = 1;
            } else if (n.length >= 5) {
                decPlaces = 0;
            } else if (n.length === 4) {
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
                
                // all variables to summarize
                var variables = this.get("variables");
                var sum = {};
                var i;
                // multiple features
                if (features.length > 1) {
                    // each feature
                    for (i = 0; i < features.length; i++) {
                        // feature is zero
                        if (i === 0) {
                            sum = features[0].attributes;
                        } else {
                            // lets add each variable
                            for (var j = 0; j < variables.length; j++) {
                                if (features[i].attributes.hasOwnProperty(variables[j])) {
                                    sum[variables[j]] += features[i].attributes[variables[j]];
                                }
                            }
                        }
                    }
                } else {
                    // single feature
                    sum = features[0].attributes;
                }
                
                console.log('what');
                
                
                for(var k in sum){
                    if(sum.hasOwnProperty(k)){
                        sum[k] = this._decPlaces(sum[k]);
                    }
                }
                
                /*
                
                // format number in stats
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
                */
                
                sum.dataSourceUrl = this.get("dataSourceUrl");
                
                this.set("stats", sum);
                
                console.log(sum);
                
                
                // show geo stats
                domStyle.set(this.domNode, 'display', 'block');

                var panelType;
                // get selected panel
                if (this._displayedContainer) {
                    panelType = domAttr.get(this._displayedContainer, 'data-type');
                }
  
                //Create Slider for Geo data panels
                var sliders, childNode, divGeoPanel;
                // todo
                sliders = query('.' + this.css.statsPanelSelected + ' .' + this.css.divOuterSliderContainer, dom.byId('geodata_container'));
                // sliders
                if(sliders && sliders.length){
                    // each slider node
                    array.forEach(sliders, lang.hitch(this, function(node) {
                        divGeoPanel = query('.' + this.css.divGeoDataHolder, node)[0];
                        if(divGeoPanel){
                            childNode = query('.' + this.css.statsPanelDataBlock, divGeoPanel).length;
                            if (childNode > 3) {
                                if (divGeoPanel) {
                                    /* var objSlider = new Slider({
                                        sliderContent: divGeoPanel,
                                        sliderParent: node
                                    });
                                    */
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
                if (panelType) {
                    this._showExpanded(panelType);
                }
                // panel click
                this._panelClick = on(query('.' + this.css.menuPanel, this.domNode), 'click', lang.hitch(this, function(evt) {
                    this._hideInfoWindow();
                    var type = domAttr.get(evt.currentTarget, 'data-type');
                    this._showExpanded(type);
                }));
                // expanded panel click
                this._expandedClick = on(query('.' + this.css.statsPanelSelected + ' .' + this.css.divHeaderClose, this.domNode), 'click', lang.hitch(this, function() {
                    this._hideExpanded();
                }));        
            } else {
                // hide geo stats
                domStyle.set(this.domNode, 'display', 'none');
            }
        },
        _hideInfoWindow: function(){
            this.map.infoWindow.hide();
        },
        _setPanelWidth: function(node) {
            // todo
            // need to do this on window resize
            if (node) {
                // todo get content box?
                var mb = domGeom.getMarginBox(dom.byId('geo_panel'));
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
            var divCount = query('.' + this.css.statsPanel + ' .' + this.css.statsCount, dom.byId('geo_panel'));
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
        _showExpanded: function(type) {
            
            domClass.add(this.domNode, this.css.statsOpen);
            
            // todo
            var sliders, domSlider, divCount;
            sliders = query('.' + this.css.statsPanelSelected + '[data-type="' + type + '"]', this.domNode);
            if(sliders && sliders.length){
                domSlider = sliders[0];
                this._currentPanelSlider = domSlider;
                
                //if (domStyle.get(domSlider, 'display') === 'none') {
                    var panels = query('.' + this.css.statsPanelSelected, this.domNode); 
                    array.forEach(panels, lang.hitch(this, function(elementCount) {
                        //domStyle.set(elementCount, 'display', 'none');
                        domClass.remove(elementCount, this.css.animateSlider);
                    }));
                    var items = query('.' + this.css.menuPanel, this.domNode);
                    array.forEach(items, lang.hitch(this, function(elementCount) {
                        domClass.remove(elementCount, this.css.statsPanelSelectedExpand);
                    }));
                    divCount = query('.' + this.css.statsPanel + ' .' + this.css.statsCount, this.domNode);
                    //display slider
                    this._displayContainer(domSlider);
                    //hide geo-data count panels.
                    array.forEach(divCount, function(elementCount) {
                        domStyle.set(elementCount, 'display', 'none');
                    });
                    this._setPanelWidth(domSlider);
                    var selected = query('.' + this.css.menuPanel + '[data-type="' + type + '"]', this.domNode)[0];
                    domClass.add(selected, this.css.statsPanelSelectedExpand);
                //}
            }
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
