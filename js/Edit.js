define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase"
],
function (
    Evented,
    declare,
    lang,
    _WidgetBase
) {
    var Widget = declare([_WidgetBase, Evented], {
        declaredClass: "modules.Edit",
        // lifecycle: 1
        constructor: function(options) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            
            console.log(defaults);
            
        },
        // start widget. called by user
        startup: function() {
            console.log('edit mode');
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */

        /* ---------------- */
        /* Public Functions */
        /* ---------------- */


    });
    return Widget;
});
