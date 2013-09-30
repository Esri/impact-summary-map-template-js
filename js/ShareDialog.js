define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/_OnDijitClickMixin",
    "dijit/_TemplatedMixin",
    "dojo/on",
    // load template
    "dojo/text!modules/dijit/templates/ShareDialog.html",
    "dojo/i18n!modules/nls/ShareDialog",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojox/html/entities",
    "esri/urlUtils",
    "esri/geometry/Extent",
    "dijit/Dialog"
],
function (
    Evented,
    declare,
    lang,
    has, esriNS,
    _WidgetBase, _OnDijitClickMixin, _TemplatedMixin,
    on,
    dijitTemplate, i18n,
    domClass, domStyle, domConstruct,
    entities,
    urlUtils,
    Extent,
    Dialog
) {
    var Widget = declare([_WidgetBase, _OnDijitClickMixin, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.ShareDialog",
        templateString: dijitTemplate,
        options: {
            theme: "ShareDialog",
            visible:true,
            url: window.location.href,
            embedWidth: "100%",
            embedHeight: "500",
            dialog: null
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            declare.safeMixin(this.options, options);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            // properties
            this.set("theme", this.options.theme);
            this.set("url",this.options.url);
            this.set("visible", this.options.visible);
            this.set("dialog", this.options.dialog);
            this.set("embedWidth", this.options.config.embedMapSize[0].width);
            this.set("embedHeight", this.options.config.embedMapSize[0].height);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("url", this._updateUrlWatch);
            this.watch("shortUrl", this._updateUrlWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                container: "buttonContainer",
                embed: "embedPage",
                button: "toggle-grey",
                buttonSelected: "toggle-grey-on",
                icon: "icon-share",
                facebookIcon: "icon-facebook-squared-1 shareDialogIconClass",
                twitterIcon: "icon-twitter-1 shareDialogIconClass",
                gplusIcon: "icon-gplus shareDialogIconClass",
                emailIcon: "icon-mail shareDialogIconClass",
                shareDialogText: "shareDialogText",
                shareMapURL: "shareMapURL"
            };
        },
        // start widget. called by user
        startup: function() {
            this._init();
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        // open
        // close
        // toggle
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */
        show: function(){
            this.set("visible", true);  
        },
        hide: function(){
            this.set("visible", false);
        },
        open: function(){
            domClass.add(this._buttonNode, this._css.buttonSelected);
            this.get("dialog").show();
            this.emit("open", {});
            this._shareLink();
        },
        close: function(){
            this.get("dialog").hide();
            this.emit("close", {});
        },
        toggle: function(){
            var open = this.get("dialog").get("open");
            if(open){
                this.close();
            }
            else{
                this.open();    
            }
            this.emit("toggle", {});
        },
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _init: function() {
            // dialog
            if(!this.get("dialog")){
                var dialog = new Dialog({
                    title: i18n.widgets.ShareDialog.title,
                    style: "max-width: 300px"
                }, this._dialogNode);
                this.set("dialog", dialog);
            }
            on(this.get("dialog"), 'hide', lang.hitch(this, function(){
                domClass.remove(this._buttonNode, this._css.buttonSelected);
            }));
            this._visible();
            this._updateUrlWatch();
            this.set("loaded", true);
            this.emit("load", {});
            this.config.extent = [this.map.extent.xmin, this.map.extent.ymin, this.map.extent.xmax, this.map.extent.ymax];
            this._configUrlParams();
            this._setSharing();
            this.map.on("extent-change", lang.hitch(this, function (evt) {
                this.config.extent = [evt.extent.xmin, evt.extent.ymin, evt.extent.xmax, evt.extent.ymax];
                this._setSharing();
            }));
            on(this._comboBoxNode, "change", lang.hitch(this, function (evt) {
                this.set("embedWidth", this.config.embedMapSize[evt.currentTarget.value].width);
                this.set("embedHeight", this.config.embedMapSize[evt.currentTarget.value].height);
                this._updateUrlWatch();
            }));
            for (i in this.config.embedMapSize) {
                this._comboBoxNode.options[this._comboBoxNode.options.length] = new Option(this.config.embedMapSize[i].width + " X " + this.config.embedMapSize[i].height, i);
            }

            on(this._facebookButton, "click", lang.hitch(this, function (evt) {
                this._configureShareLink(this.config.facebookURL);
            }));

            on(this._twitterButton, "click", lang.hitch(this, function (evt) {
                this._configureShareLink(this.config.twitterURL);
            }));

            on(this._gpulsButton, "click", lang.hitch(this, function (evt) {
                this._configureShareLink(this.config.googlePlusURL);
            }));

            on(this._emailButton, "click", lang.hitch(this, function (evt) {
                this._configureShareLink(this.config.emailURL, true);
            }));
        },
        _updateUrlWatch: function(){            
            var es = '<iframe width="' + this.get("embedWidth") + '" height="' + this.get("embedHeight") + '" src="' + this.get("url") + '" frameborder="0" scrolling="no"></iframe>';
            this.set("embed", es);
            this._embedNode.innerHTML = entities.encode(es);
        },
        _setSharing: function () {
            var urlParams = ['webmap', 'basemap', 'extent', 'layers'];
            if (urlParams) {
                this.config.shareParams = '';
                for (var i = 0; i < urlParams.length; i++) {
                    if (this.config.hasOwnProperty(urlParams[i]) && (this.config[urlParams[i]].toString() !== '') || typeof (this.config[urlParams[i]]) === 'object') {
                        if (i === 0) {
                            this.config.shareParams = '?';
                        } else {
                            this.config.shareParams += '&';
                        }
                        this.config.shareParams += urlParams[i] + '=' + this.config[urlParams[i]].toString();
                    }
                }
                this.config.shareURL = document.location.href + this.config.shareParams;
                this.set("url", this.config.shareURL);
                this._shareMapUrlText.value = this.config.shareURL;
            }
        },

        _shareLink: function () {
            var _self = this, tinyResponse, url;
            url = dojo.string.substitute(this.config.TinyURLServiceURL, [encodeURIComponent(this.config.shareURL)]);
            dojo.io.script.get({
                url: url,
                callbackParamName: "callback",
                load: function (data) {
                    tinyResponse = data;
                    _self.tinyUrl = data;
                    var attr = _self.config.TinyURLResponseAttribute.split(".");
                    for (var x = 0; x < attr.length; x++) {
                        _self.tinyUrl = _self.tinyUrl[attr[x]];
                    }
                },
                error: function (error) {
                    alert(error);
                }
            });
        },
        _configureShareLink: function (Link, isMail) {
            if (this.tinyUrl) {
                var fullLink, w = 650, h = 400, left, top;
                left = (screen.width / 2) - (w / 2);
                top = (screen.height / 2) - (h / 2);
                fullLink = Link + this.tinyUrl;
                if (isMail) {
                    parent.location = fullLink;
                } else {
                    window.open(fullLink, 'share', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left, true);
                }
            }
        },

        _getUrlObject: function () {
            var params = urlUtils.urlToObject(document.location.href);
            // make sure it's an object
            params.query = params.query || {};
            return params;
        },
        _configUrlParams: function () {
            var params, startExtent, splitExtent;
            params = this._getUrlObject();
            params.query = this.extractUrlParams(params.query);
            if (params.query.extent) {
                splitExtent = params.query.extent.split(',');
                // Loaded from URL
                startExtent = new Extent({
                    xmin: parseFloat(splitExtent[0]),
                    ymin: parseFloat(splitExtent[1]),
                    xmax: parseFloat(splitExtent[2]),
                    ymax: parseFloat(splitExtent[3]),
                    spatialReference: this.map.extent.spatialReference
                });
                this.map.setExtent(startExtent);
            }
        },

        extractUrlParams: function (obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string' && (obj[key].toLowerCase() === 'false' || obj[key].toLowerCase() === 'null' || obj[key].toLowerCase() === 'undefined')) {
                        obj[key] = false;
                    } else if (typeof obj[key] === 'string' && obj[key].toLowerCase() === 'true') {
                        obj[key] = true;
                    }
                }
            }
            return obj;
        },

        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _visible: function(){
            if(this.get("visible")){
                domStyle.set(this.domNode, 'display', 'block');
            }
            else{
                domStyle.set(this.domNode, 'display', 'none');
            }
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.ShareDialog", Widget, esriNS);
    }
    return Widget;
});