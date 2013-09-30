define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/query",
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
            this.domNode = this.sliderContent;
            this._createSlider(this.sliderContent);
        },

        //function to create slider based on content
        _createSlider: function (slider) {
            var sliderOuterContainer, sliderInnerContainer, sliderTable, sliderRow, sliderTdLeftArrow, sliderTdRightArrow, sliderDivLeftArrow, sliderSpanLeftArrow, sliderColumn, sliderDiv, sliderContentDiv,
                sliderContentHolder, sliderDivRightArrow, sliderPaginationHolder;
            sliderOuterContainer = domConstruct.create('div', { "id": "slider" + slider.id, "class": "divSliderContainer" }, null);
            sliderOuterContainer.ondblclick = function (evt) {
                if (evt.stopPropagation) {
                    evt.stopPropagation();
                } else {
                    evt.cancelBubble = true;
                }
            };
            sliderInnerContainer = domConstruct.create('div', { "class": "divInnerSliderContainer" }, sliderOuterContainer);
            sliderTable = domConstruct.create('table', {}, sliderInnerContainer);
            sliderRow = domConstruct.create('tr', {}, sliderTable);
            sliderTdLeftArrow = domConstruct.create('td', { "align": "left", "style": "width: 30px;" }, sliderRow);
            sliderDivLeftArrow = domConstruct.create('div', { "id": slider.id + "leftArrow" }, sliderTdLeftArrow);
            sliderSpanLeftArrow = domConstruct.create('span', { "class": "leftArrow disableArrow" }, sliderDivLeftArrow);

            sliderColumn = domConstruct.create('td', {}, sliderRow);
            sliderDiv = domConstruct.create('div', { "id": "divSlider" + slider.id, "class": "divSliderContent" }, sliderColumn);
            sliderContentDiv = domConstruct.create('div', { "class": "carouselscroll slidePanel" }, sliderDiv);
            sliderContentHolder = domConstruct.create('div', {}, sliderContentDiv);

            sliderContentHolder.appendChild(this.sliderContent);
            sliderPaginationHolder = domConstruct.create('div', { "class": "divPagination" }, null);
            sliderDiv.appendChild(sliderPaginationHolder);
            var childNodes = Math.ceil(query('td', this.sliderContent).length / 4);
            for (var i = 0; i < childNodes; i++) {
                var tbl1 = domConstruct.create("span", { "class": "paginationDot" }, null);
                domAttr.set(tbl1, "index", i);
                if (i == 0) {
                    domClass.add(tbl1, "bgColor");
                }
                sliderPaginationHolder.appendChild(tbl1);
                on(tbl1, 'click', lang.hitch(this, function (evt) {
                    this._showSelectedPage(sliderOuterContainer.id, evt.currentTarget);
                }));
            }
            sliderTdRightArrow = domConstruct.create('td', { "align": "left", "style": "width: 30px;" }, sliderRow);
            sliderDivRightArrow = domConstruct.create('div', { "id": slider.id + "rightArrow" }, sliderTdRightArrow);
            sliderSpanLeftArrow = domConstruct.create('span', { "class": "rightArrow" }, sliderDivRightArrow);

            this.sliderParent.appendChild(sliderOuterContainer);
            on(sliderDivRightArrow, 'click', lang.hitch(this, function () {
                this._slideRight(sliderOuterContainer.id);
            }));
            on(sliderDivLeftArrow, 'click', lang.hitch(this, function () {
                this._slideLeft(sliderOuterContainer.id);
            }));
            on(window, 'resize', lang.hitch(this, function () {
                var carousel = query('#' + sliderOuterContainer.id + ' .carouselscroll')[0];
                this.newLeft = 0;
                domStyle.set(carousel, 'left', this.newLeft + "px");
                domClass.add(query('#' + sliderOuterContainer.id + ' .leftArrow')[0], "disableArrow");
                domClass.remove(query('#' + sliderOuterContainer.id + ' .rightArrow')[0], "disableArrow");
            }));
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
                if (this.newLeft > (-sliderContentWidth)) {
                    this.newLeft = 0;
                }
                else {
                    this.newLeft = this.newLeft + sliderContentWidth;
                }
                domStyle.set(carousel, 'left', this.newLeft + "px");
                this._moveSliderPage(sliderId, false);

            }
        },
        _setArrowVisibility: function (sliderId) {
            var difference, carousel, sliderContent;
            carousel = query('#' + sliderId + ' .carouselscroll')[0];
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            difference = sliderContent.offsetWidth - carousel.offsetWidth;

            if (this.newLeft == 0) {
                domClass.add(query('#' + sliderId + ' .leftArrow')[0], "disableArrow");
            }
            if ((this.newLeft < (difference + 5))) {
                domClass.add(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
            }
            if (difference > 0) {
                domClass.add(query('#' + sliderId + ' .rightArrow')[0], "disableArrow");
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
            var currentPage = query('#' + sliderId + ' .bgColor')[0];
            var nxtPageId = parseInt(domAttr.get(currentPage, "index"));
            isSlideRight ? nxtPageId++ : nxtPageId--;
            var nextPage = query('#' + sliderId + ' .paginationDot')[nxtPageId];
            domClass.remove(currentPage, "bgColor");
            domClass.add(nextPage, "bgColor");
            this._setArrowVisibility(sliderId);
        }
    });
    return Widget;
});
