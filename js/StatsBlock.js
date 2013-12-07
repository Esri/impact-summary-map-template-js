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
                stats: 'geoData',
                statsOpen: 'geoDataExpanded',
                statsPanel: 'panel',
                statsCount: 'count',
                statsTitle: "title",
                statsPanelSelected: 'panel-expanded',
                statsPanelSelectedExpand: "panel-selected-expand",
                statsPanelDataBlock: 'data-block',
                statsPanelDataBlockLast: 'data-block-last',
                animateSlider: "animateSlider",
                divOuterSliderContainer: "divOuterSliderContainer",
                divHeader: "divHeader",
                bgColor: "bgColor",
                hTitle: "hTitle",
                hNumber: "hNumber",
                divHeaderTitle: "divHeaderTitle",
                divGeoDataHolder: "divGeoDataHolder",
                divHeaderClose: "divHeaderClose",
                iconCancel: "icon-cancel-1",
                divSliderContainer: "divSliderContainer",
                dataSourceUrl: "dataSourceUrl",
                divInnerSliderContainer: "divInnerSliderContainer",
                divLeft: "divLeft",
                divRight: "divRight",
                leftArrow: "leftArrow",
                rightArrow: "rightArrow",
                disableArrow: "disableArrow",
                divSliderContent: "divSliderContent",
                carousel: "carousel",
                slidePanel: "slidePanel",
                divPagination: "divPagination",
                paginationDot: "paginationDot",                
                clear: "clear"
            };
            //set no of slide to display
            this.displayPageCount = 3;
        },
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
        resize: function() {
            if (this._displayedContainer) {
                this._setPanelWidth(this._displayedContainer);
            }
        },
        show: function() {
            domStyle.set(this.domNode, 'display', 'block');
        },
        hide: function() {
            domStyle.set(this.domNode, 'display', 'none');
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
            this._displayStats();
            // ready
            this.set("loaded", true);
            this.emit("load", {});
        },
        _formatNumber: function(n, decPlaces) {
            // format large numbers
            decPlaces = Math.pow(10, decPlaces);
            // thousand, million, billion, trillion.
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
        _decPlaces: function(n) {
            // number not defined
            if (!n) {
                n = 0;
            }
            // format number according to length
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
            // get features to display
            var features = this.get("features");
            // if we have features
            if (features && features.length) {
                // all config to summarize
                var config = this.get("config");
                var stats = {};
                var i, j, k;
                // each feature
                for (i = 0; i < features.length; i++) {
                    // first feature
                    if (i === 0) {
                        // lets add 1st variable
                        for (j = 0; j < config.length; j++) {
                            // sum parent
                            if (features[i].attributes.hasOwnProperty(config[j].attribute)) {
                                stats[config[j].attribute] = features[i].attributes[config[j].attribute];
                            }
                            // sum children
                            for (k = 0; k < config[j].children.length; k++) {
                                stats[config[j].children[k].attribute] = features[i].attributes[config[j].children[k].attribute];
                            }
                        }
                    } else {
                        // lets sum each variable
                        for (j = 0; j < config.length; j++) {
                            // append sum parent
                            if (features[i].attributes.hasOwnProperty(config[j].attribute)) {
                                stats[config[j].attribute] += features[i].attributes[config[j].attribute];
                            }
                            // append sum children
                            for (k = 0; k < config[j].children.length; k++) {
                                stats[config[j].children[k].attribute] += features[i].attributes[config[j].children[k].attribute];
                            }
                        }
                    }
                }
                // set widget stats
                this.set("stats", stats);
                // create panels from stats
                this._createPanels();
                // show geo stats
                this.show();
                
                
                
                /*
                
                // todo
                //Create Slider for Geo data panels
                var sliders, childNode, divGeoPanel;
                // todo
                sliders = query('.' + this.css.statsPanelSelected + ' .' + this.css.divOuterSliderContainer, this._geoDataContainerNode);
                // sliders
                if (sliders && sliders.length) {
                
                
                    
                
                    // each slider node
                    array.forEach(sliders, lang.hitch(this, function(node) {
                        divGeoPanel = query('.' + this.css.divGeoDataHolder, node)[0];
                        if (divGeoPanel) {
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
                            if (panels && panels.length) {
                                // last item class
                                domClass.add(panels[panels.length - 1], this.css.statsPanelDataBlockLast);
                            }
                        }
                    }));
                }
                
                */
                
                
                // if panel is expanded already
                if (this._displayedContainer) {
                    this._showExpanded(this._displayedIndex);
                }
                // create panel events
                for (i = 0; i < this._nodes.length; i++) {
                    this._panelClickEvent(this._nodes[i].panel, i);
                    this._panelCloseEvent(this._nodes[i].detailedPanelHeaderClose);
                }
            } else {
                this.hide();
            }
        },
        _panelCloseEvent: function(node) {
            var expandedClick = on(node, 'click', lang.hitch(this, function() {
                this._hideExpanded();
            }));
            this._events.push(expandedClick);
        },
        _panelClickEvent: function(node, index) {
            // panel click
            var panelClick = on(node, 'click', lang.hitch(this, function() {
                this._showExpanded(index);
            }));
            this._events.push(panelClick);
        },
        _createPanelNode: function(index) {
            var stats = this.get("stats");
            var config = this.get("config");
            var item = config[index];
            // panel container
            var container = domConstruct.create('div', {
                className: this.css.statsPanel + " " + item.theme
            });
            domConstruct.place(container, this._geoPanelsNode, 'last');
            // panel number
            var count = domConstruct.create('div', {
                className: this.css.statsCount,
                innerHTML: this._decPlaces(stats[item.attribute])
            });
            domConstruct.place(count, container, 'last');
            // panel title
            var title = domConstruct.create('div', {
                className: this.css.statsTitle,
                innerHTML: item.label
            });
            domConstruct.place(title, container, 'last');
            // save references to these nodes
            this._nodes[index] = lang.mixin(this._nodes[index], {
                panel: container,
                panelCount: count,
                panelTitle: title
            });
        },
        _createExpandedPanelNode: function(index) {
            var config = this.get("config");
            var item = config[index];
            var stats = this.get("stats");
            // expanded panel container
            var container = domConstruct.create('div', {
                className: this.css.statsPanelSelected + " " + item.theme
            });
            domConstruct.place(container, this._geoDataPanelsExpandedNode, 'last');
            // header
            var header = domConstruct.create('div', {
                className: this.css.divHeader
            });
            domConstruct.place(header, container, 'last');
            var headerTitle = domConstruct.create('div', {
                className: this.css.bgColor + " " + this.css.divHeaderTitle
            });
            domConstruct.place(headerTitle, header, 'last');
            var headerSpanTitle = domConstruct.create('span', {
                className: this.css.hTitle,
                innerHTML: item.label
            });
            domConstruct.place(headerSpanTitle, headerTitle, 'last');
            var headerSpanNumber = domConstruct.create('span', {
                className: this.css.hNumber,
                innerHTML: this._decPlaces(stats[item.attribute])
            });
            domConstruct.place(headerSpanNumber, headerTitle, 'last');
            var headerClose = domConstruct.create('div', {
                className: this.css.divHeaderClose + " " + this.css.iconCancel,
                title: this._i18n.StatsBlock.close
            });
            domConstruct.place(headerClose, header, 'last');
            var headerClear = domConstruct.create('div', {
                className: this.css.clear
            });
            domConstruct.place(headerClear, header, 'last');
            // slider container
            var sliderContainer = domConstruct.create('div', {
                className: this.css.divOuterSliderContainer
            });
            domConstruct.place(sliderContainer, container, 'last');
            
            
            
            
            
            
            
            var sliderContainer2, sliderInnerContainer, divLeft, leftArrow, divSliderContent, carousel, sliderDataHolder, divPagination, divRight, rightArrow, clearSliderContent;
            
            if (item.children && item.children.length && item.children.length > 3) {
                // slider container
                sliderContainer2 = domConstruct.create('div', {
                    className: this.css.divSliderContainer
                }); 
                // slider container
                sliderInnerContainer = domConstruct.create('div', {
                    className: this.css.divInnerSliderContainer
                });
                domConstruct.place(sliderInnerContainer, sliderContainer2, 'last'); 
                // paginate left
                divLeft = domConstruct.create('div', {
                    className: this.css.divLeft
                });
                domConstruct.place(divLeft, sliderInnerContainer, 'last');
                // left arrow button
                leftArrow = domConstruct.create('div', {
                    className: this.css.leftArrow + " " + this.css.disableArrow,
                    title: this._i18n.StatsBlock.previous
                });
                domConstruct.place(leftArrow, divLeft, 'last');
                // another inner container
                divSliderContent = domConstruct.create('div', {
                    className: this.css.divSliderContent
                });
                domConstruct.place(divSliderContent, sliderInnerContainer, 'last');
                // carousel holder
                carousel = domConstruct.create('div', {
                    className: this.css.carousel + " " + this.css.slidePanel
                });
                domConstruct.place(carousel, divSliderContent, 'last');
                // container for data
                sliderDataHolder = domConstruct.create('div', {
                    className: this.css.divGeoDataHolder
                });
                domConstruct.place(sliderDataHolder, carousel, 'last');
                // pagination
                divPagination = domConstruct.create('div', {
                    className: this.css.divPagination
                });
                domConstruct.place(divPagination, divSliderContent, 'last');
                // right paginate
                divRight = domConstruct.create('div', {
                    className: this.css.divRight
                });
                domConstruct.place(divRight, sliderInnerContainer, 'last');
                // right arrow button
                rightArrow = domConstruct.create('div', {
                    className: this.css.rightArrow + " " + this.css.disableArrow,
                    title: this._i18n.StatsBlock.next
                });
                domConstruct.place(rightArrow, divLeft, 'last');
                // clear slider
                clearSliderContent = domConstruct.create('div', {
                    className: this.css.clear
                });
                domConstruct.place(clearSliderContent, sliderInnerContainer, 'last');
            }
            else{
                // container for data
                sliderContainer2 = domConstruct.create('div', {
                    className: this.css.divGeoDataHolder
                });
                sliderDataHolder = sliderContainer2;
            }
            domConstruct.place(sliderContainer2, sliderContainer, 'last');

            
            // create all children stats
            if (item.children && item.children.length) {
                for (var i = 0; i < item.children.length; i++) {
                    var dataBlock = this._createPanelBlockNodes(index, i);
                    domConstruct.place(dataBlock, sliderDataHolder, 'last');
                }
            }
            
            var clearBlocks = domConstruct.create('div', {
                className: this.css.clear
            });
            domConstruct.place(clearBlocks, sliderDataHolder, 'last');
            // source link
            var sliderDataSource = domConstruct.create('div', {
                className: this.css.dataSourceUrl
            });
            domConstruct.place(sliderDataSource, sliderContainer, 'last');
            var sliderDataSourceAnchor = domConstruct.create('a', {
                innerHTML: "source",
                href: item.dataSourceUrl,
                target: "_blank"
            });
            domConstruct.place(sliderDataSourceAnchor, sliderDataSource, 'last');
            
            
            // save references to these nodes
            this._nodes[index] = lang.mixin(this._nodes[index], {
                detailedPanel: container,
                detailedPanelHeader: header,
                detailedPanelHeaderTitle: headerTitle,
                detailedPanelHeaderSpanTitle: headerSpanTitle,
                detailedPanelHeaderSpanNumber:headerSpanNumber,
                detailedPanelHeaderClose: headerClose,
                detailedPanelHeaderClear: headerClear,
                detailedOuterContainer: sliderContainer,
                detailedContainer: sliderContainer2,
                detailedInnerContainer: sliderInnerContainer,
                detailedInnerContainer2: divSliderContent,
                detailedLeft: divLeft,
                detailedLeftArrow: leftArrow,
                detailedCarousel: carousel,
                detailedData: sliderDataHolder,
                detailedPagination: divPagination,
                detailedRight: divRight,
                detailedRightArrow: rightArrow,
                clearDetailedData: clearSliderContent,
                detailedDataSource: sliderDataSource,
                detailedDataSourceAnchor: sliderDataSourceAnchor,
                clearBlocks: clearBlocks
            });
            
        },
        _createPanelBlockNodes: function(parentIndex, childIndex) {
            var config = this.get("config");
            var item = config[parentIndex];
            var childItem = item.children[childIndex];
            var stats = this.get("stats");
            
            // last block
            var lastBlock = "";
            if((item.children.length - 1) === childIndex){
                lastBlock = " " + this.css.statsPanelDataBlockLast;
            }
            // data block children stats
            var container = domConstruct.create('div', {
                className: this.css.statsPanelDataBlock + lastBlock
            });
            // child count
            var count = domConstruct.create('div', {
                className: this.css.statsCount,
                innerHTML: this._decPlaces(stats[childItem.attribute])
            });
            domConstruct.place(count, container, 'last');
            // child label
            var title = domConstruct.create('div', {
                className: this.css.statsTitle,
                title: childItem.label,
                innerHTML: childItem.label
            });
            domConstruct.place(title, container, 'last');
            return container;
        },
        _createPanels: function() {
            var config = this.get("config");
            // remove old events
            this._removeEvents();
            // clear previous html
            this._geoPanelsNode.innerHTML = '';
            this._geoDataPanelsExpandedNode.innerHTML = '';
            // block themes
            var themes = ['theme_1', 'theme_2', 'theme_3', 'theme_4'];
            // node variables
            this._nodes = [];
            
            
            // create each block
            for (var i = 0; i < config.length && i < themes.length; i++) {
                // panel node references
                this._nodes[i] = {};
                // assign theme
                config[i].theme = themes[i];
                config.index = i;
                // block node
                this._createPanelNode(i);
                // expnaded node
                this._createExpandedPanelNode(i);
                
            }
            
            
            console.log(this._nodes);
            
            // clear blocks
            var clear = domConstruct.create('div', {
                className: this.css.clear
            });
            domConstruct.place(clear, this._geoPanelsNode, 'last');
            // clear expanded
            var clear2 = domConstruct.create('div', {
                className: this.css.clear
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
        _removeExpandedClass: function() {
            // remove stats panel expanded class from all panels
            array.forEach(this._nodes, lang.hitch(this, function(item) {
                domClass.remove(item.panel, this.css.statsPanelSelectedExpand);
                domClass.remove(item.detailedPanel, this.css.animateSlider);
            }));
            // set variables null
            this._displayedContainer = null;
            this._displayedIndex = null;
        },
        _hideExpanded: function() {
            // remove expanded class from widget
            domClass.remove(this.domNode, this.css.statsOpen);
            // remove expanded class from panels
            this._removeExpandedClass();
        },
        _showExpanded: function(index) {
            this._removeExpandedClass();
            // add expanded class to widget
            domClass.add(this.domNode, this.css.statsOpen);
            // set currenlty displayed container
            this._displayedContainer = this._nodes[index].detailedPanel;
            this._displayedIndex = index;
            // show panel
            domClass.add(this._displayedContainer, this.css.animateSlider);
            // set width of panel
            this._setPanelWidth(this._displayedContainer);
            // add expanded class
            domClass.add(this._nodes[index].panel, this.css.statsPanelSelectedExpand);
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.StatsBlock", Widget, esriNS);
    }
    return Widget;
});
