define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/a11yclick",
    "dijit/_TemplatedMixin",
    "dojo/on",
    // load template
    "dojo/text!modules/dijit/templates/StatSlider.html",
    "dojo/i18n!modules/nls/StatSlider",
    "dojo/dom-class",
    "dojo/dom-style"
],
function (
    Evented,
    declare,
    lang,
    has, esriNS,
    _WidgetBase, a11yclick, _TemplatedMixin,
    on,
    dijitTemplate, i18n,
    domClass, domStyle
) {
    var Widget = declare([_WidgetBase, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.StatSlider",
        templateString: dijitTemplate,
        options: {
            
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            // classes
            this._css = {
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
                clear: "clear"
            };
            //set no of slide to display
            this.displayPageCount = 3;
        },
        // bind listener for button to action
        postCreate: function() {
            this.inherited(arguments);
            //this.own(on(this._buttonNode, a11yclick, lang.hitch(this, this.toggle)));
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
            
            
            domConstruct.place(this.sliderContent, this._sliderContent, "last");
            
            this._createPagination(this._sliderContentContainer, this._sliderContainer);
            
            domConstruct.place(this._sliderContainer, this.sliderParent, "last");
            
            this._resizeSlider(sliderOuterContainer.id);
            
            

            
            //change previous/next slide on clicking of left and right arrow.
            var pageRight = on(sliderDivRightArrow, 'click', lang.hitch(this, function() {
                this._slide(sliderOuterContainer.id, true);
            }));
            this._events.push(pageRight);
            //change previous/next slide on clicking of left and right arrow.
            var pageLeft = on(sliderDivLeftArrow, 'click', lang.hitch(this, function() {
                this._slide(sliderOuterContainer.id, false);
            }));
            this._events.push(pageRight);
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
            
            selectedPage = query('.bgColor', this._sliderContent)[0];
            
            
            this._showSelectedPage(sliderId, selectedPage);
        },
        _createPageEvent: function(spanPaginationDot, sliderOuterContainer) {
            //Go to slider page on selecting its corresponding pagination dot
            on(spanPaginationDot, 'click', lang.hitch(this, function(evt) {
                this._showSelectedPage(evt.currentTarget);
                this._setArrowVisibility(sliderOuterContainer.id);
            }));
        },
        // create UI for pagination bar for slider
        _createPagination: function(sliderDiv, sliderOuterContainer) {
            var pageCount, sliderPaginationHolder, spanPaginationDot;
            sliderPaginationHolder = domConstruct.create('div', {
                "class": "divPagination"
            });
            domConstruct.place(sliderPaginationHolder, sliderDiv, "last");
            //calculate no of possible pages in slider
            var geoChildren = query('.data-block', this.sliderContent);
            pageCount = Math.ceil(geoChildren.length / this.displayPageCount);
            for (var i = 0; i < pageCount; i++) {
                spanPaginationDot = domConstruct.create("span", {
                    "class": "paginationDot"
                }, null);
                domAttr.set(spanPaginationDot, "index", i);
                if (i === 0) {
                    domClass.add(spanPaginationDot, "bgColor");
                }
                domConstruct.place(spanPaginationDot, sliderPaginationHolder, "last");
                // pagination event
                this._createPageEvent(spanPaginationDot, sliderOuterContainer);
            }
        },
        _slide: function(sliderId, isSlideRight) {
            var sliderContent, carousel, newLeft, selectedPage, pageIndex = 0;
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            carousel = query('#' + sliderId + ' .carousel')[0];
            this._moveSliderPage(sliderId, isSlideRight);
            selectedPage = query('#' + sliderId + ' .bgColor')[0];
            if (selectedPage) {
                pageIndex = parseInt(domAttr.get(selectedPage, "index"));
            }
            if (sliderContent) {
                newLeft = -(domStyle.get(sliderContent, 'width') + this.displayPageCount) * pageIndex;
                domStyle.set(carousel, 'left', newLeft + "px");
            }
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
        //set first page in slider
        _resetSlider: function(sliderId) {
            var carousel = query('#' + sliderId + ' .carousel')[0];
            if (carousel) {
                domStyle.set(carousel, 'left', 0 + "px");
            }
            var disableArrow = query('#' + sliderId + ' .leftArrow')[0];
            if (disableArrow) {
                domClass.add(disableArrow, "disableArrow");
            }
            var rightArrow = query('#' + sliderId + ' .rightArrow')[0];
            if (rightArrow) {
                domClass.remove(rightArrow, "disableArrow");
            }
            var bgColor = query('#' + sliderId + ' .bgColor')[0];
            if (bgColor) {
                domClass.remove(bgColor, "bgColor");
            }
            var paginationDot = query('#' + sliderId + ' .paginationDot')[0];
            if (paginationDot) {
                domClass.add(paginationDot, "bgColor");
            }
        },
        
        //display selected slider page
        _showSelectedPage: function(page) {
            var sliderContent, carousel, pageIndex = 0, newLeft;
            sliderContent = query(' divSliderContent', this._sliderContent)[0];
            carousel = query('.carousel', this._sliderContent)[0];
            if (page) {
                pageIndex = parseInt(domAttr.get(page, "index"), 10);
            }
            if (sliderContent) {
                newLeft = -(domStyle.get(sliderContent, 'width') + this.displayPageCount) * pageIndex;
            }
            if (carousel) {
                domStyle.set(carousel, 'left', newLeft + "px");
            }
            var bgColor = query('.bgColor', this._sliderContent)[0];
            if (bgColor) {
                domClass.remove(bgColor, "bgColor");
            }
            if (page) {
                domClass.add(page, "bgColor");
            }
        },
        //handle left/right arrow visibility
        _setArrowVisibility: function(sliderId) {
            var pageId = 0,
                pageCount, currentPage = query('#' + sliderId + ' .bgColor')[0];
            if (currentPage) {
                if (currentPage) {
                    pageId = parseInt(domAttr.get(currentPage, "index"));
                }
                pageCount = query('#' + sliderId + ' .paginationDot').length;
                if (pageId === 0) {
                    domClass.add(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
                    domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
                } else if (pageId < pageCount - 1) {
                    domClass.remove(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
                    domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
                } else if (pageId === pageCount - 1) {
                    domClass.add(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
                    domClass.remove(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
                }
            }
        },
        //display next/previous slider page
        _moveSliderPage: function(sliderId, isSlideRight) {
            var nxtPageId = 0,
                nextPage, currentPage = query('#' + sliderId + ' .bgColor')[0];
            if (currentPage) {
                nxtPageId = parseInt(domAttr.get(currentPage, "index"));
            }
            if (isSlideRight) {
                nxtPageId++;
            } else {
                nxtPageId--;
            }
            nextPage = query('#' + sliderId + ' .paginationDot')[nxtPageId];
            if (currentPage) {
                domClass.remove(currentPage, "bgColor");
            }
            if (nextPage) {
                domClass.add(nextPage, "bgColor");
            }
            this._setArrowVisibility(sliderId);
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.StatSlider", Widget, esriNS);
    }
    return Widget;
});
