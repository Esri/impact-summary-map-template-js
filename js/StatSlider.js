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
    // load template
    "dojo/text!modules/dijit/templates/StatSlider.html",
    "dojo/i18n!modules/nls/StatSlider",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct"
],
function (
    Evented,
    declare,
    lang, array,
    has, esriNS,
    _WidgetBase, a11yclick, _TemplatedMixin,
    on, query,
    dijitTemplate, i18n,
    domClass, domStyle, domConstruct
) {
    var Widget = declare([_WidgetBase, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.StatSlider",
        templateString: dijitTemplate,
        options: {
            content: null
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            this.set("content", defaults.content);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            // classes
            this._css = {
                divOuterSliderContainer: "divOuterSliderContainer",
                divSliderContainer: "divSliderContainer",
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
                bgColor: "bgColor",
                clear: "clear"
            };
            //set no of slide to display
            this.displayPageCount = 3;
        },
        // bind listener for button to action
        postCreate: function() {
            this.inherited(arguments);
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
            domConstruct.place(this.get("content"), this._sliderContent, "last");
            //domConstruct.place(this.get("content"), this._sliderContent, "last");
            this._createPagination();
            this._resizeSlider();
            var winResize = on(window, 'resize', lang.hitch(this, function() {
                this._resizeSlider();
            }));
            this._events.push(winResize);
            //change previous/next slide on clicking of left and right arrow.
            var pageRight = on(this._sliderPageRight, 'click', lang.hitch(this, function() {
                this._slide(true);
            }));
            this._events.push(pageRight);
            //change previous/next slide on clicking of left and right arrow.
            var pageLeft = on(this._sliderPageLeft, 'click', lang.hitch(this, function() {
                this._slide(false);
            }));
            this._events.push(pageLeft);
            // ready
            this.set("loaded", true);
            this.emit("load", {});
        },
        //resize slider contents
        _resizeSlider: function() {
            var sliderContentHolder, sliderTableWidth, selectedPage;
            sliderContentHolder = query('.divGeoDataHolder', this._sliderContent)[0];
            if (sliderContentHolder) {
                var geoChildren = query('.data-block', sliderContentHolder);
                if (geoChildren && geoChildren[0]) {
                    sliderTableWidth = (domStyle.get(geoChildren[0], 'width') + 1) * geoChildren.length;
                }
                domStyle.set(sliderContentHolder, 'width', sliderTableWidth + 'px');
            }
            domStyle.set(this._sliderContent, 'width', sliderTableWidth + 'px');
            selectedPage = this._paginationNodes[0];
            this._showSelectedPage(selectedPage);
        },
        _createPageEvent: function(spanPaginationDot) {
            //Go to slider page on selecting its corresponding pagination dot
            var pageDot = on(spanPaginationDot, 'click', lang.hitch(this, function(evt) {
                this._showSelectedPage(evt.currentTarget);
                this._setArrowVisibility();
            }));
            this._events.push(pageDot);
        },
        // create UI for pagination bar for slider
        _createPagination: function() {
            this._paginationNodes = [];
            //calculate no of possible pages in slider
            var geoChildren = query('.data-block', this.content);
            var pageCount = Math.ceil(geoChildren.length / this.displayPageCount);
            for (var i = 0; i < pageCount; i++) {
                var spanPaginationDot = domConstruct.create("span", {
                    "class": this._css.paginationDot
                });
                if (i === 0) {
                    domClass.add(spanPaginationDot, this._css.bgColor);
                    this._selectedPage = spanPaginationDot;
                    this._selectedPageIndex = 0;
                }
                domConstruct.place(spanPaginationDot, this._sliderPagination, "last");
                // pagination event
                this._createPageEvent(spanPaginationDot);
                this._paginationNodes.push(spanPaginationDot);
            }
            this._setArrowVisibility();
        },
        _slide: function(isSlideRight) {
            this._moveSliderPage(isSlideRight);
        },
        //set slider panel width on window resize
        _setPanelWidth: function(node) {
            if (node) {
                var sl = query('.geoPanel');
                if (sl && sl.length) {
                    var sliderWidth = sl[0].offsetWidth;
                    domStyle.set(node, 'width', sliderWidth + 'px');
                }
            }
        },
        //display selected slider page
        _showSelectedPage: function(page) {
            var newLeft;
            var pageIndex = array.indexOf(this._paginationNodes, page);
            //pageIndex = parseInt(domAttr.get(page, "index"), 10);
            this._selectedPage = page;
            this._selectedPageIndex = pageIndex;
            newLeft = -(domStyle.get(this._sliderContentContainer, 'width') + this.displayPageCount) * pageIndex;
            domStyle.set(this._sliderContent, 'left', newLeft + "px");
            for (var i = 0; i < this._paginationNodes.length; i++) {
                if (i === pageIndex) {
                    domClass.add(this._paginationNodes[i], "bgColor");
                } else {
                    domClass.remove(this._paginationNodes[i], "bgColor");
                }
            }
        },
        //handle left/right arrow visibility
        _setArrowVisibility: function() {
            if (this._selectedPageIndex === 0) {
                domClass.add(this._sliderPageLeft, this._css.disableArrow);
                domClass.remove(this._sliderPageRight, this._css.disableArrow);
            } else if (this._selectedPageIndex < this._paginationNodes.length - 1) {
                domClass.remove(this._sliderPageLeft, this._css.disableArrow);
                domClass.remove(this._sliderPageRight, this._css.disableArrow);
            } else if (this._selectedPageIndex === this._paginationNodes.length - 1) {
                domClass.add(this._sliderPageRight, this._css.disableArrow);
                domClass.remove(this._sliderPageLeft, this._css.disableArrow);
            }
        },
        //display next/previous slider page
        _moveSliderPage: function(isSlideRight) {
            var nxtPageId = this._selectedPageIndex;
            if (isSlideRight) {
                nxtPageId++;
            } else {
                nxtPageId--;
            }
            var nextPage = this._paginationNodes[nxtPageId];
            this._showSelectedPage(nextPage);
            this._setArrowVisibility();
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.StatSlider", Widget, esriNS);
    }
    return Widget;
});
