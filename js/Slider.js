define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct"
],
function (
     Evented,
     declare,
     lang,
     WidgetBase,
     on,
     query,
     domClass,
     domStyle,
     domConstruct
){
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
                sliderContentHolder, sliderDivRightArrow;
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
        },

        //function to move slider on right side
        _slideRight: function (slider) {
            var tdWidth, difference, carousel, sliderContent;
            carousel = query('#' + slider + ' .carouselscroll')[0];
            sliderContent = query('#' + slider + ' .divSliderContent')[0];

            tdWidth = (sliderContent.offsetWidth / 4) + 1;
            difference = sliderContent.offsetWidth - carousel.offsetWidth;
            if (!domClass.contains(query('#' + slider + ' .rightArrow')[0], "disableArrow")) {
                if (this.newLeft >= difference) {
                    if (domClass.contains(query('#' + slider + ' .leftArrow')[0], "disableArrow")) {
                        domClass.remove(query('#' + slider + ' .leftArrow')[0], "disableArrow");
                    }
                    this.newLeft = this.newLeft - tdWidth;
                    domStyle.set(carousel, 'left', this.newLeft + "px");
                    if ((this.newLeft <= (difference + 5))) {
                        domClass.add(query('#' + slider + ' .rightArrow')[0], "disableArrow");
                    }
                    if (domClass.contains(query('#' + slider + ' .rightArrow')[0], "disableArrow")) {
                        domClass.remove(query('#' + slider + ' .leftArrow')[0], "disableArrow");
                    }
                }
            }
            if (difference > 0) {
                domClass.add(query('#' + slider + ' .rightArrow')[0], "disableArrow");
            }
        },

        //function to move slider on left side
        _slideLeft: function (slider) {
            var tdWidth, difference, carousel, sliderContent;
            carousel = query('#' + slider + ' .carouselscroll')[0];
            sliderContent = query('#' + slider + ' .divSliderContent')[0];
            tdWidth = (sliderContent/ 4) + 1;
            difference = sliderContent.offsetWidth - carousel.offsetWidth;
            if (this.newLeft < 0) {
                if (this.newLeft > (-tdWidth)) {
                    this.newLeft = 0;
                }
                else {
                    this.newLeft = this.newLeft + tdWidth;
                }
                domStyle.set(carousel,'left', this.newLeft+"px");
                if (domClass.contains(query('#' + slider + ' .rightArrow')[0], "disableArrow")) {
                    if (this.newLeft >= difference) {
                        domClass.remove(query('#' + slider + ' .rightArrow')[0], "disableArrow");
                    }
                }
                if (this.newLeft == 0) {
                    domClass.add(query('#' + slider + ' .leftArrow')[0], "disableArrow");
                }
            }
        }
    });
    return Widget;
});
