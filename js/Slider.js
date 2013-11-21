define([
    "dojo/_base/declare",
    "dojo/_base/lang",
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
     declare,
     lang,
     on,
     query,
     i18n,
     topic,
     domClass,
     domStyle,
     domAttr,
     domConstruct
) {
    var Widget = declare(null, {
        constructor: function(options) {
            declare.safeMixin(this, options);
            this.resizeEvent = null;
            this._i18n = i18n;
            //set no of slide to display
            this.displayPageCount = 3;
            
            console.log('test1');
            this._createSlider();
            
            console.log('test2');
            
            topic.subscribe("resizeGeoDataSlider", lang.hitch(this, function(sliderId) {
                console.log(sliderId);
                setTimeout(lang.hitch(this, function() {
                    this._resizeSlider(sliderId);
                }), 0);
            }));
        },
        //function to create slider based on content
        _createSlider: function() {
            var sliderOuterContainer, sliderInnerContainer, sliderLeftArrowHolder, sliderRightArrowHolder, sliderDivLeftArrow, sliderDiv, sliderContentDiv, sliderDivRightArrow;
            sliderOuterContainer = domConstruct.create('div', {
                "id": "slider" + this.sliderContent.id,
                "class": "divSliderContainer"
            });
            sliderInnerContainer = domConstruct.create('div', {
                "class": "divInnerSliderContainer"
            }, sliderOuterContainer);
            sliderLeftArrowHolder = domConstruct.create('div', {
                "class": "divLeft"
            }, sliderInnerContainer);
            sliderDiv = domConstruct.create('div', {
                "id": "divSlider" + this.sliderContent.id,
                "class": "divSliderContent"
            }, sliderInnerContainer);
            sliderContentDiv = domConstruct.create('div', {
                "class": "carousel slidePanel"
            });
            
            console.log('bleh');
            
            
            domConstruct.place(sliderContentDiv, sliderDiv, "last");
            //sliderDiv.appendChild(sliderContentDiv);
            
            domConstruct.place(this.sliderContent, sliderContentDiv, "last");
            //sliderContentDiv.appendChild(this.sliderContent);
            
            console.log('bleh2');
            
            sliderRightArrowHolder = domConstruct.create('div', {
                "class": "divRight"
            }, sliderInnerContainer);
            sliderDivLeftArrow = domConstruct.create('div', {
                "id": this.sliderContent.id + "leftArrow",
                "class": "leftArrow disableArrow",
                "title": i18n.widgets.Slider.previous
            }, sliderLeftArrowHolder);
            
            console.log('bleh3');
            
            this._createPagination(sliderDiv, sliderOuterContainer);
            
            console.log('bleh4');
            
            sliderDivRightArrow = domConstruct.create('div', {
                "id": this.sliderContent.id + "rightArrow",
                "class": "rightArrow",
                "title": i18n.widgets.Slider.next
            }, sliderRightArrowHolder);
            
            
            domConstruct.place(sliderOuterContainer, this.sliderParent, "last");
            //this.sliderParent.appendChild(sliderOuterContainer);
            
            console.log('bleh5');
            this._resizeSlider(sliderOuterContainer.id);
            
            console.log('bleh6');
            //change previous/next slide on clicking of left and right arrow.
            on(sliderDivRightArrow, 'click', lang.hitch(this, function() {
                this._slide(sliderOuterContainer.id, true);
            }));
            on(sliderDivLeftArrow, 'click', lang.hitch(this, function() {
                this._slide(sliderOuterContainer.id, false);
            }));
        },
        _createPageEvent: function(spanPaginationDot, sliderOuterContainer){
            //Go to slider page on selecting its corresponding pagination dot
            on(spanPaginationDot, 'click', lang.hitch(this, function(evt) {
                this._showSelectedPage(sliderOuterContainer.id, evt.currentTarget);
                this._setArrowVisibility(sliderOuterContainer.id);
            }));
        },
        // create UI for pagination bar for slider
        _createPagination: function(sliderDiv, sliderOuterContainer) {
            var pageCount, sliderPaginationHolder, spanPaginationDot;
            sliderPaginationHolder = domConstruct.create('div', {
                "class": "divPagination"
            }, null);
            sliderDiv.appendChild(sliderPaginationHolder);
            //calculate no of possible pages in slider
            pageCount = Math.ceil(this.sliderContent.childElementCount / this.displayPageCount);
            for (var i = 0; i < pageCount; i++) {
                spanPaginationDot = domConstruct.create("span", {
                    "class": "paginationDot"
                }, null);
                domAttr.set(spanPaginationDot, "index", i);
                if (i === 0) {
                    domClass.add(spanPaginationDot, "bgColor");
                }
                sliderPaginationHolder.appendChild(spanPaginationDot);
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
            if(selectedPage){
                pageIndex = parseInt(domAttr.get(selectedPage, "index"));   
            }
            
            console.log(selectedPage);
            console.log(pageIndex);
            
            if(sliderContent){
                newLeft = -(domStyle.get(sliderContent, 'width') + this.displayPageCount) * pageIndex;
                domStyle.set(carousel, 'left', newLeft + "px");
            }
        },
        //set slider panel width on window resize
        _setPanelWidth: function(node) {
            if (node) {
                var sl = query('.geoPanel');
                if(sl && sl.length){
                    var sliderWidth = sl[0].offsetWidth;
                    domStyle.set(node, 'width', sliderWidth + 'px');
                }
            }
        },
        //set first page in slider
        _resetSlider: function(sliderId) {
            var carousel = query('#' + sliderId + ' .carousel')[0];
            if(carousel){
                domStyle.set(carousel, 'left', 0 + "px");
            }
            var disableArrow = query('#' + sliderId + ' .leftArrow')[0];
            if(disableArrow){
                domClass.add(disableArrow, "disableArrow");
            }
            var rightArrow = query('#' + sliderId + ' .rightArrow')[0];
            if(rightArrow){
                domClass.remove(rightArrow, "disableArrow");
            }
            var bgColor = query('#' + sliderId + ' .bgColor')[0];
            if(bgColor){
                domClass.remove(bgColor, "bgColor");
            }
            var paginationDot = query('#' + sliderId + ' .paginationDot')[0];
            if(paginationDot){
                domClass.add(paginationDot, "bgColor");
            }
        },
        //resize slider contents
        _resizeSlider: function(sliderId) {
            console.log('boo');
            var carousel, sliderContentHolder, sliderTableWidth, selectedPage;
            carousel = query('#' + sliderId + ' .carousel')[0];
            console.log('boo1');
            sliderContentHolder = query('#' + sliderId + ' .divGeoDataHolder')[0];
            if(sliderContentHolder){
                
                var geoChildren = query('.data-block', sliderContentHolder);
                
                console.log('boo2');
                if(geoChildren && geoChildren[0]){
                    console.log('yes');
                    sliderTableWidth = (domStyle.get(geoChildren[0], 'width') + 1) * geoChildren.length;    
                }
                domStyle.set(sliderContentHolder, 'width', sliderTableWidth + 'px');
            }
            if(carousel){
                console.log('boo3');
                domStyle.set(carousel, 'width', sliderTableWidth + 'px');
            }
            console.log('boo4');
            selectedPage = query('#' + sliderId + ' .bgColor')[0];
            console.log('boo5');
            this._showSelectedPage(sliderId, selectedPage);
            console.log('boo6');
        },
        //display selected slider page
        _showSelectedPage: function(sliderId, page) {
            console.log('hah 1');
            var sliderContent, carousel, pageIndex, newLeft;
            sliderContent = query('#' + sliderId + ' .divSliderContent')[0];
            
            console.log('hah 2');
            carousel = query('#' + sliderId + ' .carousel')[0];
            
            console.log('hah 3');
            
            var pages = query('.paginationDot', sliderContent);
            
            console.log(pages);
            
            console.log(page);
            
            var pageIndex = 0;
            if(page){
                pageIndex = parseInt(domAttr.get(page, "index"), 10);    
            }
            
            console.log('hah 4');
            if(sliderContent){
                newLeft = -(domStyle.get(sliderContent, 'width') + this.displayPageCount) * pageIndex;
                console.log('hah 5');
            }
            if(carousel){
                domStyle.set(carousel, 'left', newLeft + "px");
                console.log('hah 6');
            }
            var bgColor = query('#' + sliderId + ' .bgColor')[0];
            
            console.log('hah 7');
            
            if(bgColor){
                domClass.remove(bgColor, "bgColor");
                console.log('hah 8');
            }
            if(page){
                domClass.add(page, "bgColor");    
            }
            
            console.log('hah 9');
        },
        //handle left/right arrow visibility
        _setArrowVisibility: function(sliderId) {
            var pageId = 0, pageCount, currentPage = query('#' + sliderId + ' .bgColor')[0];
            if(currentPage){
                if(currentPage){
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
            var nxtPageId = 0, nextPage, currentPage = query('#' + sliderId + ' .bgColor')[0];
            if(currentPage){
                nxtPageId = parseInt(domAttr.get(currentPage, "index"));
            }
            if (isSlideRight) {
                nxtPageId++;
            } else {
                nxtPageId--;
            }
            nextPage = query('#' + sliderId + ' .paginationDot')[nxtPageId];
            if(currentPage){
                domClass.remove(currentPage, "bgColor");
            }
            if(nextPage){
                domClass.add(nextPage, "bgColor");
            }
            this._setArrowVisibility(sliderId);
        }
    });
    return Widget;
});
