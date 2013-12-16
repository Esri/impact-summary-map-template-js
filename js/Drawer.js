define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/_base/fx",
    "dojo/fx/easing",
    "dojo/Deferred",
    "dojo/window"
],
function (
    Evented,
    declare,
    lang,
    has, esriNS,
    _WidgetBase,
    on,
    domClass, domStyle,
    BorderContainer, ContentPane,
    fx, easing,
    Deferred,
    win
) {
    var Widget = declare([_WidgetBase, Evented], {
        declaredClass: "esri.dijit.Drawer",
        options: {
            size: 850,
            container: null,
            contentCenter: null,
            contentLeft: null,
            toggleButton: null
        },
        // lifecycle: 1
        constructor: function(options) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // properties
            this.set("size", defaults.size);
            this.set("container", defaults.container);
            this.set("contentCenter", defaults.contentCenter);
            this.set("contentLeft", defaults.contentLeft);
            this.set("toggleButton", defaults.toggleButton);
            // classes
            this.css = {
                toggleBlue: 'toggle-grey',
                toggleBlueOn: 'toggle-grey-on',
                drawerOpen: "drawerOpen"
            };
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
        resize: function(){
            if(this._bc_outer){
                this._bc_outer.layout();
            }
            // drawer status resize
            this.emit('resize',{});
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        // resize
        // toggle
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */
        toggle: function() {
            // deferred to return
            var def = new Deferred();
            // if drawer is shown
            if (domClass.contains(document.body, this.css.drawerOpen)) {
                // force open drawer
                this._forceShowDrawer();
                // remove drawer opened class
                domClass.remove(document.body, this.css.drawerOpen);
                // collapse width
                fx.animateProperty({
                    node: this._drawer,
                    properties: {
                        width: {
                            start: this._drawerWidth,
                            end: 0
                        }
                    },
                    duration: 250,
                    easing: easing.expoOut,
                    onAnimate: lang.hitch(this, function() {
                        // render border container
                        this.resize();
                    }),
                    onEnd: lang.hitch(this, function() {
                        // remove shown drawer
                        this._checkDrawerStatus();
                        // return
                        def.resolve();
                    })
                }).play();
            } else {
                domStyle.set(this._drawer, "width", "0px");
                // add drawer
                this._forceShowDrawer();
                // expand width
                fx.animateProperty({
                    node: this._drawer,
                    properties: {
                        width: {
                            start: 0,
                            end: this._drawerWidth
                        }
                    },
                    duration: 250,
                    easing: easing.expoOut,
                    onAnimate: lang.hitch(this, function() {
                        // render border container
                        this.resize();
                    }),
                    onEnd: lang.hitch(this, function() {
                        // drawer now open
                        domClass.add(document.body, this.css.drawerOpen);
                        // remove shown drawer
                        this._checkDrawerStatus();
                        // return
                        def.resolve();
                    })
                }).play();
            }
            return def.promise;
        },
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
            // destroy content panes
            if(this.cp_outer_center){
                this.cp_outer_center.destroy();
            }
            if(this.cp_outer_left){
                this.cp_outer_left.destroy();
            }
            // destroy content pane
            if(this._bc_outer){
                this._bc_outer.destroy();
            }
        },
        _init: function() {
            // setup events
            this._removeEvents();
            // outer container
            this._bc_outer = new BorderContainer({
                gutters: false
            }, this.get("container"));
            // center panel
            this.cp_outer_center = new ContentPane({
                region: "center"
            }, this.get("contentCenter"));
            this._bc_outer.addChild(this.cp_outer_center);
            // left panel
            this.cp_outer_left = new ContentPane({
                region: "left"
            }, this.get("contentLeft"));
            this._bc_outer.addChild(this.cp_outer_left);
            // start border container
            this._bc_outer.startup();
            // drawer button
            var toggleClick = on(this.get("toggleButton"), 'click', lang.hitch(this, function() {
                this.toggle();
            }));
            this._events.push(toggleClick);
            // drawer node
            this._drawer = this.cp_outer_left.domNode;
            // drawer width
            this._drawerWidth = domStyle.get(this._drawer, 'width');
            // window size event
            var winResize = on(window, 'resize', lang.hitch(this, function(){
                this._windowResized();
            }));
            this._events.push(winResize);
            // check window size
            this._windowResized();
            // fix layout
            this.resize();
            this.set("loaded", true);
            this.emit("load", {});  
        },
        _windowResized: function(){
            // view screen
            var vs = win.getBox();
            // if window width is less than specified size
            if (vs.w < this.get("size")) {
                // hide drawer
                domClass.remove(document.body, this.css.drawerOpen);
            }
            else{
                // show drawer
                domClass.add(document.body, this.css.drawerOpen);
            }
            // remove forced open
            this._checkDrawerStatus();
        },
        _checkDrawerStatus: function(){
            // remove display and width styles that exist
            domStyle.set(this._drawer, "display", "");
            domStyle.set(this._drawer, "width", "");
            // border container layout
            this.resize();
            // hamburger button toggle
            this._toggleButton();
        },
        _forceShowDrawer: function(){
            domStyle.set(this._drawer, "display", "block");
        },
        _toggleButton: function() {
            // if drawer is displayed
            if (domClass.contains(document.body, this.css.drawerOpen)) {
                // has normal class
                if (domClass.contains(this.get("toggleButton"), this.css.toggleBlue)) {
                    // replace with selected class
                    domClass.replace(this.get("toggleButton"), this.css.toggleBlueOn, this.css.toggleBlue);
                }
            } else {
                // has selected class
                if (domClass.contains(this.get("toggleButton"), this.css.toggleBlueOn)) {
                    // replace with normal class
                    domClass.replace(this.get("toggleButton"), this.css.toggleBlue, this.css.toggleBlueOn);
                }
            }
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.Drawer", Widget, esriNS);
    }
    return Widget;
});
