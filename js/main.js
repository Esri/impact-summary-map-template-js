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
    "dojo/_base/event",
    "esri/graphic",
    "esri/layers/GraphicsLayer"
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
    SimpleFillSymbol,
    SimpleLineSymbol,
    Color,
    Mustache,
    panelsView,
    event,
    Graphic,
    GraphicsLayer
) {
    return declare("", null, {
        config: {},
        constructor: function(config) {
            //config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information. 
            this.config = config;
            ready(lang.hitch(this, function() {
                this._createWebMap();
            }));
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
                    if (features[0].attributes.hasOwnProperty(this.config.impact_field)) {
                        var value = features[0].attributes[this.config.impact_field];
                        var item = query('[data-value=' + value + ']', dom.byId('renderer_menu'));
                        if (item.length) {
                            domClass.add(item[0], 'selected');
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
                this._expandedClick = on(query('.panel-expanded', this.dataNode), 'click', lang.hitch(this, function(evt) {
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
            query('.panel-expanded', this.dataNode).style('display', 'none');
            query('.panel', this.dataNode).style('display', 'inline-block');
        },
        _showExpanded: function(type) {
            query('.panel', this.dataNode).style('display', 'none');
            query('.panel-expanded[data-type="' + type + '"]', this.dataNode).style('display', 'inline-block');
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
            if(renderer){
                var infos = renderer.infos;
                if (infos && infos.length) {
                    this._multiple = true;
                    var html = '';
                    html += '<div class="title">' + this.config.menu_title + '</div>';
                    html += '<ul class="menuList">';
                    for (var i = 0; i < infos.length; i++) {
                        html += '<li class="item" data-value="' + infos[i].maxValue + '">' + infos[i].label + '</li>';
                    }
                    html += '</ul>';
                    html += '</div>';
                    html += '<div id="summarize" class="summarize">Summarize</div>';
                    if (html) {
                        dom.byId('renderer_menu').innerHTML = html;
                        domStyle.set(dom.byId('renderer_menu'), 'display', 'block');
                        this._summarizeClick = on(dom.byId('summarize'), 'click', lang.hitch(this, function() {
                            var q = new Query();
                            q.where = '1 = 1';
                            this._impactLayer.queryFeatures(q, lang.hitch(this, function(fs) {
                                this._clearSelected();
                                this._displayStats(fs.features);
                            }));
                        }));
                        on(dom.byId('renderer_menu'), '.item:click', lang.hitch(this, function(evt) {
                            this._clearSelected();
                            var value = parseInt(domAttr.get(evt.target, 'data-value'), 10);
                            domClass.add(evt.target, 'selected');
                            var q = new Query();
                            if (value === 0) {
                                q.where = '1 = 1';
                            } else {
                                q.where = this.config.impact_field + ' = ' + value;
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
            this._selectedGraphics = new GraphicsLayer({
                id: "selectedArea",
                visible: true
            });
            this.map.addLayer(this._selectedGraphics);
            this.dataNode = domConstruct.place(domConstruct.create('div', {
                className: "geoData"
            }), this.map._layersDiv, 'first');
            // get layer by id
            this._impactLayer = this.getLayerByTitle(this.map, this.layers, "Impact Area");
            this._setValueRange();
            var q = new Query();
            q.where = '1=1';
            if(this._multiple){
                //q.where = '"' + this.config.impact_field + '" = (SELECT MAX("' + this.config.impact_field + '") FROM ' + this._impactLayer.id + ')';
                //console.log(q.where);
                // FIELD" = (SELECT MAX("FIELD") FROM layer)
                q.orderByFields = [this.config.impact_field + ' DESC'];   
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
            
        },
        _clearSelected: function() {
            var items = query('.selected', dom.byId('renderer_menu'));
            var i;
            if (items.length) {
                for (i = 0; i < items.length; i++) {
                    domClass.remove(items[i], 'selected');
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