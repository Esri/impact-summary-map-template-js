define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/query",
    "dojo/i18n!modules/nls/Slider",
    "dojo/dom",
    "dojo/topic",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-construct"
],
function (
     Evented,
     declare,
     lang,
     array,
     WidgetBase,
     on,
     query,
     i18n,
     dom,
     topic,
     domClass,
     domStyle,
     domAttr,
     domConstruct
) {
    var Widget = declare(null, {

        constructor: function (options) {
            declare.safeMixin(this, options);
            this.newLeft = 0;
            this.resizeEvent = null;
            this._i18n = i18n;
            this._createSlider();
            topic.subscribe("resizeGeoDataSlider",lang.hitch(this,function (sliderId) {
                this._resizeSlider(sliderId);
            }));
        },

        //function to create slider based on content
        _createSlider: function () {
            var sliderOuterContainer, sliderInnerContainer, sliderLeftArrowHolder, sliderRightArrowHolder, sliderDivLeftArrow, sliderDiv, sliderContentDiv,
                sliderDivRightArrow, sliderPaginationHolder, pageCount;
            sliderOuterContainer = domConstruct.create('div', { "id": "slider" + this.sliderContent.id, "class": "divSliderContainer" }, null);
         
            sliderInnerContainer = domConstruct.create('div', { "class": "divInnerSliderContainer" }, sliderOuterContainer);
            sliderLeftArrowHolder = domConstruct.create('div', { "class": "divLeft" }, sliderInnerContainer);
            sliderDiv = domConstruct.create('div', { "id": "divSlider" + this.sliderContent.id, "class": "divSliderContent" }, sliderInnerContainer);
            sliderContentDiv = domConstruct.create('div', { "class": "carousel slidePanel" }, null);
            sliderDiv.appendChild(sliderContentDiv);
            sliderContentDiv.appendChild(this.sliderContent);
            sliderRightArrowHolder = domConstruct.create('div', { "class": "divRight" }, sliderInnerContainer);
            sliderDivLeftArrow = domConstruct.create('div', { "id": this.sliderContent.id + "leftArrow", "class": "leftArrow disableArrow", "title": i18n.widgets.Slider.previous }, sliderLeftArrowHolder);

            sliderPaginationHolder = domConstruct.create('div', { "class": "divPagination" }, null);
            sliderDiv.appendChild(sliderPaginationHolder);
            pageCount = Math.ceil(this.sliderContent.childElementCount / 3);
            for (var i = 0; i < pageCount; i++) {
                var spanPaginationDot = domConstruct.create("span", { "class": "paginationDot" }, null);
                domAttr.set(spanPaginationDot, "index", i);
                if (i == 0) {
                    domClass.add(spanPaginationDot, "bgColor");
                }
                sliderPaginationHolder.appendChild(spanPaginationDot);
                on(spanPaginationDot, 'click', lang.hitch(this, function (evt) {
                    this._showSelectedPage(sliderOuterContainer.id, evt.currentTarget);
                    this._setArrowVisibility(sliderOuterContainer.id);
                }));
            }
            sliderDivRightArrow = domConstruct.create('div', { "id": this.sliderContent.id + "rightArrow", "class": "rightArrow", "title": i18n.widgets.Slider.next }, sliderRightArrowHolder);
            this.sliderParent.appendChild(sliderOuterContainer);
            this._resizeSlider(sliderOuterContainer.id);

            on(sliderDivRightArrow, 'click', lang.hitch(this, function () {
                this._slideRight(sliderOuterContainer.id);
            }));
            on(sliderDivLeftArrow, 'click', lang.hitch(this, function () {
                this._slideLeft(sliderOuterContainer.id);
            }));
        },
        _stopEvent: function () {
            if (event && event.stopPropagation) {
                event.stopPropagation();
            } else if (window.event) {
                window.event.cancelBubble = true;
	    }
        },
        _setPanelWidth: function (node) {
            if(node) {
                var sliderWidth = query('.geoPanel')[0].offsetWidth;
                domStyle.set(node,'width',sliderWidth + 'px');
            }
        },
        _resetSlider: function (sliderId) {
            var carousel = query('#' + sliderId + ' .carousel')[0];
            this.newLeft = 0;
            domStyle.set(carousel, 'left', this.newLeft + "px");
            domClass.add(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
            domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            domClass.remove(query('#' + sliderId + ' .bgColor')[0], "bgColor");
            domClass.add(query('#' + sliderId + ' .paginationDot')[0], "bgColor");
        },
        _resizeSlider: function (sliderId) {
            var carousel,sliderContentHolder,sliderTableWidth,selectedPage;
            carousel = query('#' + sliderId + ' .carousel')[0];
            sliderContentHolder=query('#'+sliderId+' .tblSlide')[0];
            sliderTableWidth = (domStyle.get(sliderContentHolder.children[0], 'width') + 1) * sliderContentHolder.childElementCount;
            domStyle.set(sliderContentHolder,'width',sliderTableWidth+'px');
            domStyle.set(carousel, 'width', sliderTableWidth + 'px');
            selectedPage = query('#' + sliderId + ' .bgColor')[0];
            this._showSelectedPage(sliderId, selectedPage);
        },
        _showSelectedPage: function (sliderId, page) {
            var sliderContent, carousel, pageIndex;
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            carousel = query('#' + sliderId + ' .carousel')[0];
            pageIndex = parseInt(domAttr.get(page, "index"));
            this.newLeft = -(domStyle.get(sliderContent,'width') + 4) * pageIndex;
            domStyle.set(carousel, 'left', this.newLeft + "px");
            domClass.remove(query('#' + sliderId + ' .bgColor')[0], "bgColor");
            domClass.add(page, "bgColor");


        },
        //function to move slider on right side
        _slideRight: function (sliderId) {
            var tdWidth, difference, carousel, sliderContent;
            carousel = query('#' + sliderId + ' .carousel')[0];
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            tdWidth = (sliderContent.offsetWidth) + 4;
            difference = sliderContent.offsetWidth - carousel.offsetWidth;
            if (!domClass.contains(query('#' + sliderId + ' .rightArrow')[0], "disableArrow")) {
                if (this.newLeft >= difference) {
                    if (domClass.contains(query('#' + sliderId + ' .leftArrow')[0], "disableArrow")) {
                        domClass.remove(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
                    }
                    this.newLeft = this.newLeft - tdWidth;
                    domStyle.set(carousel, 'left', this.newLeft + "px");
                    this._moveSliderPage(sliderId, true);
                }
            }

        },

        //function to move slider on left side
        _slideLeft: function (sliderId) {
            var sliderContentWidth, carousel, sliderContent;
            carousel = query('#' + sliderId + ' .carousel')[0];
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            sliderContentWidth = (sliderContent.offsetWidth) + 4;
            if (this.newLeft < 0) {
                this.newLeft = (this.newLeft > (-sliderContentWidth)) ? 0 : this.newLeft + sliderContentWidth;

                domStyle.set(carousel, 'left', this.newLeft + "px");
                this._moveSliderPage(sliderId, false);

            }
        },
        _setArrowVisibility: function (sliderId) {
            var difference, carousel, sliderContent;
            carousel = query('#' + sliderId + ' .carousel')[0];
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            difference = sliderContent.offsetWidth - carousel.offsetWidth;
            if (this.newLeft == 0) {
                domClass.add(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
            }
            if (difference >= 0) {
                domClass.add(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            } else if ((this.newLeft < (difference + 5))) {
                domClass.add(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            } else {
                domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            }

            if (this.newLeft < 0) {
                domClass.remove(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
                if (domClass.contains(query('#' + sliderId + ' .rightArrow')[0], "disableArrow")) {
                    if (this.newLeft >= difference) {
                        domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
                    }
                }
            }
        },
        _moveSliderPage: function (sliderId, isSlideRight) {
            var nxtPageId, nextPage, currentPage = query('#' + sliderId + ' .bgColor')[0];
            nxtPageId = parseInt(domAttr.get(currentPage, "index"));
            isSlideRight ? nxtPageId++ : nxtPageId--;
            nextPage = query('#' + sliderId + ' .paginationDot')[nxtPageId];
            domClass.remove(currentPage, "bgColor");
            domClass.add(nextPage, "bgColor");
            this._setArrowVisibility(sliderId);
        }
    });
    return Widget;
});
