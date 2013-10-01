define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/query",
    "dojo/i18n!modules/nls/Slider",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-construct"
],
function (
     Evented,
     declare,
     lang,
     WidgetBase,
     on,
     query,
     i18n,
     dom,
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
            this.domNode = this.sliderContent;
            this._i18n = i18n;
            this._createSlider();
        },

        //function to create slider based on content
        _createSlider: function () {
            var sliderOuterContainer, sliderInnerContainer, sliderTable, sliderRow, sliderTdLeftArrow, sliderTdRightArrow, sliderDivLeftArrow, sliderSpanLeftArrow, sliderColumn, sliderDiv, sliderContentDiv,
                sliderContentHolder, sliderDivRightArrow, sliderPaginationHolder, pageCount;
            sliderOuterContainer = domConstruct.create('div', { "id": "slider" + this.domNode.id, "class": "divSliderContainer" }, null);
            sliderOuterContainer.ondblclick = function (evt) {
                evt.stopPropagation ? evt.stopPropagation() : evt.cancelBubble = true;
            };
            sliderInnerContainer = domConstruct.create('div', { "class": "divInnerSliderContainer" }, sliderOuterContainer);
            sliderTable = domConstruct.create('table', {}, sliderInnerContainer);
            sliderRow = domConstruct.create('tr', {}, sliderTable);
            sliderTdLeftArrow = domConstruct.create('td', { "align": "left", "style": "width: 30px;" }, sliderRow);
            sliderDivLeftArrow = domConstruct.create('div', { "id": this.domNode.id + "leftArrow", "title": i18n.widgets.Slider.previous }, sliderTdLeftArrow);
            sliderSpanLeftArrow = domConstruct.create('span', { "class": "leftArrow disableArrow" }, sliderDivLeftArrow);

            sliderColumn = domConstruct.create('td', {}, sliderRow);
            sliderDiv = domConstruct.create('div', { "id": "divSlider" + this.domNode.id, "class": "divSliderContent" }, sliderColumn);
            sliderContentDiv = domConstruct.create('div', { "class": "carouselscroll slidePanel" }, sliderDiv);
            sliderContentHolder = domConstruct.create('div', {}, sliderContentDiv);

            sliderContentHolder.appendChild(this.domNode);
            sliderPaginationHolder = domConstruct.create('div', { "class": "divPagination" }, null);
            sliderDiv.appendChild(sliderPaginationHolder);
            pageCount = Math.ceil(query('td', this.domNode).length / 4);
            for (var i = 0; i < pageCount; i++) {
                var spanPaginationDot = domConstruct.create("span", { "class": "paginationDot" }, null);
                domAttr.set(spanPaginationDot, "index", i);
                if (i == 0) {
                    domClass.add(spanPaginationDot, "bgColor");
                }
                sliderPaginationHolder.appendChild(spanPaginationDot);
                on(spanPaginationDot, 'click', lang.hitch(this, function (evt) {
                    this._showSelectedPage(sliderOuterContainer.id, evt.currentTarget);
                }));
            }
            sliderTdRightArrow = domConstruct.create('td', { "align": "left", "style": "width: 30px;" }, sliderRow);
            sliderDivRightArrow = domConstruct.create('div', { "id": this.domNode.id + "rightArrow", "title": i18n.widgets.Slider.next }, sliderTdRightArrow);
            sliderSpanLeftArrow = domConstruct.create('span', { "class": "rightArrow" }, sliderDivRightArrow);

            this.sliderParent.appendChild(sliderOuterContainer);
            on(sliderDivRightArrow, 'click', lang.hitch(this, function () {
                this._slideRight(sliderOuterContainer.id);
            }));
            on(sliderDivLeftArrow, 'click', lang.hitch(this, function () {
                this._slideLeft(sliderOuterContainer.id);
            }));
        },
        _resetSlider: function (sliderId) {
            var carousel = query('#' + sliderId + ' .carouselscroll')[0];
            this.newLeft = 0;
            domStyle.set(carousel, 'left', this.newLeft + "px");
            domClass.add(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
            domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            domClass.remove(query('#' + sliderId + ' .bgColor')[0], "bgColor");
            domClass.add(query('#' + sliderId + ' .paginationDot')[0], "bgColor");
        },
        _resizeSlider: function (sliderId) {
            var selectedPage = query('#' + sliderId + ' .bgColor')[0];
            this._showSelectedPage(sliderId, selectedPage);
        },
        _showSelectedPage: function (sliderId, page) {
            var sliderContent, carousel, pageIndex;
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            carousel = query('#' + sliderId + ' .carouselscroll')[0];

            pageIndex = parseInt(domAttr.get(page, "index"));
            this.newLeft = -(sliderContent.offsetWidth + 4) * pageIndex;
            domStyle.set(carousel, 'left', this.newLeft + "px");
            domClass.remove(query('#' + sliderId + ' .bgColor')[0], "bgColor");
            domClass.add(page, "bgColor");
            this._setArrowVisibility(sliderId);

        },
        //function to move slider on right side
        _slideRight: function (sliderId) {
            var tdWidth, difference, carousel, sliderContent;
            carousel = query('#' + sliderId + ' .carouselscroll')[0];
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
            carousel = query('#' + sliderId + ' .carouselscroll')[0];
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
            carousel = query('#' + sliderId + ' .carouselscroll')[0];
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            difference = sliderContent.offsetWidth - carousel.offsetWidth;
            domClass.remove(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            domClass.remove(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
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
