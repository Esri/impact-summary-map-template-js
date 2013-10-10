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
    "dojo/string",
     // load template
    "dojo/text!modules/dijit/templates/ShareDialog.html",
    "dojo/i18n!modules/nls/ShareDialog",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojox/html/entities",
    "esri",
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
    string,
    dijitTemplate, i18n,
    domClass, domStyle, domConstruct,
    entities,
    esri,
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
                mapSizeLabel: "mapSizeLabel",
                shareMapURL: "shareMapURL",
                iconContainer: "iconContainer",
                embedMapSizeDropDown: "embedMapSizeDropDown",
                shareDialogContent: "shareDialogContent",
                shareDialogSubHeader: "shareDialogSubHeader",
                shareDialogTextarea: "shareDialogTextarea"
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
                    style: "max-width:550px;"
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
            this._shareMapUrlText.value = this.get("url");
            on(this._comboBoxNode, "change", lang.hitch(this, function (evt) {
                this.set("embedWidth", this.config.embedMapSize[evt.currentTarget.value].width);
                this.set("embedHeight", this.config.embedMapSize[evt.currentTarget.value].height);
                this._updateUrlWatch();
            }));
            for (i in this.config.embedMapSize) {
                this._comboBoxNode.options[this._comboBoxNode.options.length] = new Option(this.config.embedMapSize[i].width + " x " + this.config.embedMapSize[i].height, i);
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

            on(this._shareMapUrlText, "click", lang.hitch(this, function () {
                this._shareMapUrlText.select();
            }));

            on(this._embedNode, "click", lang.hitch(this, function () {
                this._embedNode.select();
            }));
        },
        _updateUrlWatch: function(){
            var es = '<iframe width="' + this.get("embedWidth") + '" height="' + this.get("embedHeight") + '" src="' + this.get("url") + '" frameborder="0" scrolling="no"></iframe>';
            this.set("embed", es);
            this._embedNode.innerHTML = entities.encode(es);
        },

        _shareLink: function () {
            var _self = this, tinyResponse, url;
            url = string.substitute(this.config.TinyURLServiceURL, [encodeURIComponent(this.get("url"))]);
            esri.request({
                url: url,
                callbackParamName: "callback",
                load: function (data) {
                    tinyResponse = data;
                    _self.tinyUrl = data;
                    var attr = _self.config.TinyURLResponseAttribute.split(".");
                    for (var x = 0; x < attr.length; x++) {
                        _self.tinyUrl = _self.tinyUrl[attr[x]];
                    }

                    if (_self.tinyUrl) {
                        _self._shareMapUrlText.value = _self.tinyUrl;
                    }
                },
                error: function (error) {
                    alert(error);
                }
            });
        },
        _configureShareLink: function (Link, isMail) {
            var fullLink;
            fullLink = Link + (this.tinyUrl ? this.tinyUrl : this.get("url"));
            isMail ? parent.location = fullLink : window.open(fullLink, 'share', true);

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
