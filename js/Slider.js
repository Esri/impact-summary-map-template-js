define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/query",
    "dojo/i18n!modules/nls/Slider",
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
     WidgetBase,
     on,
     query,
     i18n,
     topic,
     domClass,
     domStyle,
     domAttr,
     domConstruct
) {
    var Widget = declare(null,{
        constructor: function (options) {
            declare.safeMixin(this,options);
            this.resizeEvent = null;
            this._i18n = i18n;
	    //set no of slide to display
            this.displayPageCount = 3;
            this._createSlider();
            topic.subscribe("resizeGeoDataSlider",lang.hitch(this,function (sliderId) {
                setTimeout(lang.hitch(this,function () {
                    this._resizeSlider(sliderId);
                }),0);
            }));
        },

        //function to create slider based on content
        _createSlider: function () {
            var sliderOuterContainer,sliderInnerContainer,sliderLeftArrowHolder,sliderRightArrowHolder,sliderDivLeftArrow,sliderDiv,sliderContentDiv,
                sliderDivRightArrow;
            sliderOuterContainer = domConstruct.create('div',{ "id": "slider" + this.sliderContent.id,"class": "divSliderContainer" },null);
            sliderInnerContainer = domConstruct.create('div',{ "class": "divInnerSliderContainer" },sliderOuterContainer);
            sliderLeftArrowHolder = domConstruct.create('div',{ "class": "divLeft" },sliderInnerContainer);
            sliderDiv = domConstruct.create('div',{ "id": "divSlider" + this.sliderContent.id,"class": "divSliderContent" },sliderInnerContainer);
            sliderContentDiv = domConstruct.create('div',{ "class": "carousel slidePanel" },null);
            sliderDiv.appendChild(sliderContentDiv);
            sliderContentDiv.appendChild(this.sliderContent);
            sliderRightArrowHolder = domConstruct.create('div',{ "class": "divRight" },sliderInnerContainer);
            sliderDivLeftArrow = domConstruct.create('div',{ "id": this.sliderContent.id + "leftArrow","class": "leftArrow disableArrow","title": i18n.widgets.Slider.previous },sliderLeftArrowHolder);
            this._createPagination(sliderDiv,sliderOuterContainer);
            sliderDivRightArrow = domConstruct.create('div',{ "id": this.sliderContent.id + "rightArrow","class": "rightArrow","title": i18n.widgets.Slider.next },sliderRightArrowHolder);
            this.sliderParent.appendChild(sliderOuterContainer);
            this._resizeSlider(sliderOuterContainer.id);
	    //change previous/next slide on clicking of left and right arrow.
            on(sliderDivRightArrow,'click',lang.hitch(this,function () {
                this._slide(sliderOuterContainer.id,true);
            }));
            on(sliderDivLeftArrow,'click',lang.hitch(this,function () {
                this._slide(sliderOuterContainer.id,false);
            }));
        },
	// create UI for pagination bar for slider
        _createPagination: function (sliderDiv,sliderOuterContainer) {
            var pageCount,sliderPaginationHolder,spanPaginationDot;
            sliderPaginationHolder = domConstruct.create('div',{ "class": "divPagination" },null);
            sliderDiv.appendChild(sliderPaginationHolder);
	    //calculate no of possible pages in slider
            pageCount = Math.ceil(this.sliderContent.childElementCount / this.displayPageCount);
            for(var i = 0;i < pageCount;i++) {
                spanPaginationDot = domConstruct.create("span",{ "class": "paginationDot" },null);
                domAttr.set(spanPaginationDot,"index",i);
                if(i == 0) {
                    domClass.add(spanPaginationDot,"bgColor");
                }
                sliderPaginationHolder.appendChild(spanPaginationDot);
		//Go to slider page on selecting its corresponding pagination dot
                on(spanPaginationDot,'click',lang.hitch(this,function (evt) {
                    this._showSelectedPage(sliderOuterContainer.id,evt.currentTarget);
                    this._setArrowVisibility(sliderOuterContainer.id);
                }));
            }
        },

        _slide: function (sliderId,isSlideRight) {
            var sliderContent,carousel,newLeft,selectedPage,pageIndex;
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            carousel = query('#' + sliderId + ' .carousel')[0];
            this._moveSliderPage(sliderId,isSlideRight);
            selectedPage = query('#' + sliderId + ' .bgColor')[0];
            pageIndex = parseInt(domAttr.get(selectedPage,"index"));
            newLeft = -(domStyle.get(sliderContent,'width') + this.displayPageCount) * pageIndex;
            domStyle.set(carousel,'left',newLeft + "px");
        },
	//set slider panel width on window resize
        _setPanelWidth: function (node) {
            if(node) {
                var sliderWidth = query('.geoPanel')[0].offsetWidth;
                domStyle.set(node,'width',sliderWidth + 'px');
            }
        },
	//set first page in slider
        _resetSlider: function (sliderId) {
            var newLeft,carousel = query('#' + sliderId + ' .carousel')[0];
            newLeft = 0;
            domStyle.set(carousel,'left',newLeft + "px");
            domClass.add(query('#' + sliderId + ' .leftArrow')[0],"disableArrow");
            domClass.remove(query('#' + sliderId + ' .rightArrow')[0],"disableArrow");
            domClass.remove(query('#' + sliderId + ' .bgColor')[0],"bgColor");
            domClass.add(query('#' + sliderId + ' .paginationDot')[0],"bgColor");
        },
	 //resize slider contents
        _resizeSlider: function (sliderId) {
            var carousel,sliderContentHolder,sliderTableWidth,selectedPage;
            carousel = query('#' + sliderId + ' .carousel')[0];
            sliderContentHolder = query('#' + sliderId + ' .divGeoDataHolder')[0];
            sliderTableWidth = (domStyle.get(sliderContentHolder.children[0],'width') + 1) * sliderContentHolder.childElementCount;
            domStyle.set(sliderContentHolder,'width',sliderTableWidth + 'px');
            domStyle.set(carousel,'width',sliderTableWidth + 'px');
            selectedPage = query('#' + sliderId + ' .bgColor')[0];
            this._showSelectedPage(sliderId,selectedPage);
        },
	//display selected slider page
        _showSelectedPage: function (sliderId,page) {
            var sliderContent,carousel,pageIndex,newLeft;
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            carousel = query('#' + sliderId + ' .carousel')[0];
            pageIndex = parseInt(domAttr.get(page,"index"));
            newLeft = -(domStyle.get(sliderContent,'width') + this.displayPageCount) * pageIndex;
            domStyle.set(carousel,'left',newLeft + "px");
            domClass.remove(query('#' + sliderId + ' .bgColor')[0],"bgColor");
            domClass.add(page,"bgColor");
        },
	//handle left/right arrow visibility
        _setArrowVisibility: function (sliderId) {
            var pageId,pageCount,currentPage = query('#' + sliderId + ' .bgColor')[0];
            pageId = parseInt(domAttr.get(currentPage,"index"));
            pageCount = query('#' + sliderId + ' .paginationDot').length;

            if(pageId == 0) {
                domClass.add(query('#' + sliderId + ' .leftArrow')[0],"disableArrow");
                domClass.remove(query('#' + sliderId + ' .rightArrow')[0],"disableArrow");
            }
            else if(pageId < pageCount - 1) {
                domClass.remove(query('#' + sliderId + ' .leftArrow')[0],"disableArrow");
                domClass.remove(query('#' + sliderId + ' .rightArrow')[0],"disableArrow");
            } else if(pageId == pageCount - 1) {
                domClass.add(query('#' + sliderId + ' .rightArrow')[0],"disableArrow");
                domClass.remove(query('#' + sliderId + ' .leftArrow')[0],"disableArrow");
            }
        },
	//display next/previous slider page
        _moveSliderPage: function (sliderId,isSlideRight) {
            var nxtPageId,nextPage,currentPage = query('#' + sliderId + ' .bgColor')[0];
            nxtPageId = parseInt(domAttr.get(currentPage,"index"));
            isSlideRight ? nxtPageId++ : nxtPageId--;
            nextPage = query('#' + sliderId + ' .paginationDot')[nxtPageId];
            domClass.remove(currentPage,"bgColor");
            domClass.add(nextPage,"bgColor");
            this._setArrowVisibility(sliderId);
        }
    });
    return Widget;
});
