define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/query",
    "dojo/dom-class",
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

            var outerDiv = domConstruct.create('div', { "id": "slider" + slider.id, "class": "divSliderContainer" }, null);
            var innerDiv = domConstruct.create('div', { "class": "divInnerSliderContainer" }, outerDiv);
            var tblSlider = domConstruct.create('table', {}, innerDiv);
            var trSlider = domConstruct.create('tr', {}, tblSlider);
            var tdLeft = domConstruct.create('td', { "align": "left", "style": "width: 30px;" }, trSlider);
            var divLeft = domConstruct.create('div', { "id": slider.id + "leftArrow" }, tdLeft);
            var spanLeft = domConstruct.create('span', { "class": "leftArrow disableArrow" }, divLeft);

            var tdSlider = domConstruct.create('td', {}, trSlider);
            var divSlider = domConstruct.create('div', { "id": "divSlider" + slider.id, "class": "divSliderContent" }, tdSlider);
            var divSliderContent = domConstruct.create('div', { "class": "carouselscroll" }, divSlider);
            var divSliderHolder = domConstruct.create('div', {}, divSliderContent);

            divSliderHolder.appendChild(this.sliderContent);

            var tdRight = domConstruct.create('td', { "align": "left", "style": "width: 30px;" }, trSlider);
            var divRight = domConstruct.create('div', { "id": slider.id + "rightArrow" }, tdRight);
            var spanLeft = domConstruct.create('span', { "class": "rightArrow" }, divRight);

            this.sliderParent.appendChild(outerDiv);
            on(divRight, 'click', lang.hitch(this, function () {
                this._slideRight(outerDiv.id);
            }));
            on(divLeft, 'click', lang.hitch(this, function () {
                this._slideLeft(outerDiv.id);
            }));


        },

        //function to move slider on right side
        _slideRight: function (slider) {
            var difference = query('#' + slider + ' .divSliderContent')[0].offsetWidth - query('#' + slider + ' .carouselscroll')[0].offsetWidth;
            if (!domClass.contains(query('#' + slider + ' .rightArrow')[0], "disableArrow")) {
                if (this.newLeft >= difference) {
                    if (domClass.contains(query('#' + slider + ' .leftArrow')[0], "disableArrow")) {
                        domClass.remove(query('#' + slider + ' .leftArrow')[0], "disableArrow");
                    }
                    this.newLeft = this.newLeft - 126;
                    query('#' + slider + ' .carouselscroll')[0].style.left = this.newLeft + "px";
                    domClass.add(query('#' + slider + ' .carouselscroll'), "slidePanel");

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
            var difference = query('#' + slider + ' .divSliderContent')[0].offsetWidth - query('#' + slider + ' .carouselscroll')[0].offsetWidth;
            if (this.newLeft < 0) {
                if (this.newLeft > (-126)) {
                    this.newLeft = 0;
                }
                else {
                    this.newLeft = this.newLeft + 126;
                }
                query('#' + slider + ' .carouselscroll')[0].style.left = this.newLeft + "px";
                domClass.add(query('#' + slider + ' .carouselscroll')[0], "slidePanel");

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