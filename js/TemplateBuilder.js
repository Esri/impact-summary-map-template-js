define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/layout/ContentPane",
    "dojo/dom",
    "dojo/on",
    "dojo/string",
    "dojo/query",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dijit/Dialog",
    "dijit/form/TextBox",
    "esri/request",
    "esri/arcgis/utils",
    "dijit/form/SimpleTextarea",
    "dijit/form/CheckBox",
    "dojo/dom-attr",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "esri/arcgis/Portal",
    "dojo/i18n!application/nls/TemplateBuilder",
    "dojo/topic",
    "dojo/Deferred",
    "dijit/Editor",
    "dijit/TooltipDialog",
    "dijit/popup",
    "dijit/_editor/plugins/AlwaysShowToolbar",
    "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/LinkDialog",
    "dijit/_editor/plugins/TextColor",
    "dojo/parser"
],
function (
    Evented,
    declare,
    lang,
    _WidgetBase,
    ContentPane,
    dom, on, string, query, array, domConstruct, domClass, Dialog, TextBox, esriRequest, arcgisUtils, SimpleTextarea, CheckBox, domAttr, domGeom, domStyle, portal, nls, topic, Deferred, Editor, TooltipDialog, popup, AlwaysShowToolbar, FontChoice, LinkDialog, TextColor) {
    var Widget = declare([_WidgetBase], {
        declaredClass: "application.TemplateBuilder",
        //URL for updating Item
        updateItemURL: "https://www.arcgis.com/sharing/content/users/${username}/items/${appid}/update",
        //Predefined keywords for basemap's available on AGOL
        availableBaseMaps: ["streets", "satellite", "hybrid", "topo", "gray", "oceans", "national-geographic", "osm"],
        unSavedChanges: false,
        previousConfigObj: null,
        configDialog: null,
        // lifecycle: 1
        constructor: function (options) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // set properties
            this.set("drawer", defaults.drawer);
            // CSS classes
            this.css = {
                builderMode: 'builder-mode',
                root: 'template-builder',
                rootContainer: 'template-builder-container'
            };
            this.previousConfigObj = lang.clone(defaults.config);
        },
        // start widget. called by user
        startup: function () {

            console.log('edit mode');

            // builder mode class to body
            domClass.add(document.body, this.css.builderMode);
            // builder node
            var builderNode = domConstruct.create('div', {
                className: this.css.root
            });
            domConstruct.create("div", { innerHTML: "Template Builder Node", "class": this.css.rootContainer }, builderNode);
            var buttonContainer = domConstruct.create("div", { class: "esriButtonContainer" }, builderNode);
            var dataConfigurationButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.dataConfigurationButtonText, "class": "esriButton" }, buttonContainer);
            var appSettingConfigurationButton = domConstruct.create("button", { "style": "margin-left:10px;", "class": "esriButton", innerHTML: nls.widgets.TemplateBuilder.applicationSettingText }, buttonContainer);
            var previewModeButton = domConstruct.create("button", { "style": "margin-left:10px;", "class": "esriButton", innerHTML: "Preview Mode" }, buttonContainer);
            var saveButtonContainer = domConstruct.create("div", { class: "esriSaveButtonContainer" }, builderNode);
            var applicationSettingSaveButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton esriSaveButton" }, saveButtonContainer);

            var unsavedChangesText = domConstruct.create("div", { "class": "esriUnsavedChanges", innerHTML: nls.widgets.TemplateBuilder.unSavedChangesAlert }, saveButtonContainer);
            on(applicationSettingSaveButton, "click", lang.hitch(this, function () {
                domAttr.set(unsavedChangesText, "innerHTML", nls.widgets.TemplateBuilder.savingChangesMessage);
                this._updateItem(false);
            }));
            on(dataConfigurationButton, "click", lang.hitch(this, function () {
                this._createConfigurationPanel(true);
            }));

            on(appSettingConfigurationButton, "click", lang.hitch(this, function () {
                this._createApplicationSettingsPanel();
            }));

            on(previewModeButton, "click", lang.hitch(this, function () {
                var currentURL = location.href.split("&edit");
                var newURL = currentURL[0];
                this.previousConfigObj.edit = "";
                this._updateItem(true);
                window.location.href = newURL;
            }));
            // place node in body
            // top content pane
            var builderContentPane = new ContentPane({
                region: "top"
            }, builderNode);
            // add pane to border container
            this.get("drawer")._borderContainer.addChild(builderContentPane);
            // resize border container
            this.get("drawer").resize();

            this._createPortal().then(lang.hitch(this, function () {
                this._showEditableUI();
            }));

        },

        _createApplicationSettingsPanel: function () {
            var settingsContainer, settingsDialog;
            settingsContainer = domConstruct.create("div", {}, null);
            this._createApplicationSettingsLeftPanel(settingsContainer);
            this._createApplicationSettingsRightPanel(settingsContainer);
            this._createBasemapSelectionPanel(settingsContainer);

            //Bottom container which contains button for saving the configuration settings
            var bottomcontainer = domConstruct.create("div", { "class": "esriAppSettingBottomContainer" }, settingsContainer);
            var saveButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.appSettingsSaveCloseButtonText, class: "esriButton esriSaveCloseButon" }, bottomcontainer);

            on(saveButton, "click", function () {
                if (settingsDialog) {
                    settingsDialog.destroy();
                }
            });
            //create dialog and show entire application settings
            settingsDialog = new Dialog({
                title: nls.widgets.TemplateBuilder.applicationSettingText,
                style: "min-width:700px !important",
                class: "esriDijitDialog",
                draggable: false
            });
            on(settingsDialog, "hide", lang.hitch(this, function () {
                //If we want to revert settings we can add some code here
            }));
            settingsDialog.setContent(settingsContainer);
            settingsDialog.show();
        },
        _createApplicationSettingsLeftPanel: function (settingsContainer) {
            var leftSettingsContent, appTitleLabelContainer, appTitleLabel, appTitleInputContainer, appTitleInput,
            appDescriptionLabelContainer, appDescriptionLabel, appDescriptionInputContainer, dijitInputContainer;

            leftSettingsContent = domConstruct.create("div", { "class": "esriSettingsLeftContent" }, settingsContainer);
            appTitleLabelContainer = domConstruct.create("div", { class: "esriClear" }, leftSettingsContent);
            appTitleLabel = domConstruct.create("label", { innerHTML: nls.widgets.TemplateBuilder.appSettingsTitleText }, appTitleLabelContainer);
            appTitleInputContainer = domConstruct.create("div", { class: "esriClear" }, leftSettingsContent);
            appTitleInput = domConstruct.create("input", { style: "width:89%;", value: this.config.title || this.response.itemData.values.title }, appTitleInputContainer);
            on(appTitleInput, "blur", lang.hitch(this, function () {
                this.config.title = domAttr.get(appTitleInput, "value");
                dom.byId("title").innerHTML = this.config.title;
            }));
            appDescriptionLabelContainer = domConstruct.create("div", { class: "esriClear" }, leftSettingsContent);
            appDescriptionLabel = domConstruct.create("label", { innerHTML: nls.widgets.TemplateBuilder.appSettingsDescriptionText }, appDescriptionLabelContainer);
            appDescriptionInputContainer = domConstruct.create("div", { class: "esriClear" }, leftSettingsContent);
            dijitValue = this.config.summary ? this.config.summary : this.response ? this.response.item.snippet : "";
            dijitInputContainer = new Editor({
                height: '250px',
                required: true,
                plugins: ['bold', 'italic', 'underline', 'createLink'],
                value: dijitValue
            }, appDescriptionInputContainer);
            dijitInputContainer.startup();
            on(dijitInputContainer, "blur", lang.hitch(this, function () {
                this.config.summary = domAttr.get(dijitInputContainer, "value");
                domAttr.set(dom.byId("summary"), "innerHTML", this.config.summary);
            }));
        },

        _createApplicationSettingsRightPanel: function (settingsContainer) {
            var rightSettingsContent = domConstruct.create("div", { "class": "esriSettingsRightContent" }, settingsContainer);
            //First column for Rendererd Area
            var rendererContainer, rendererLabelContainer, rendererLabel, rendererbuttonContainer, onOffButtonLabel, onOffButtondiv,
                buttonContainer, rendererSortContainer, rendererSortInnerContainer, rendererSortLabel, rendererSorttoggle;

            rendererContainer = domConstruct.create("div", { class: "esriClear" }, rightSettingsContent);
            rendererLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, rendererContainer);
            rendererLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.appSetingsRendererAreaText }, rendererLabelContainer);
            rendererbuttonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, rendererContainer);
            currentState = this._checkButtonState(this.config.enableEntireAreaButton);
            areaOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, rendererbuttonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, rendererbuttonContainer);
            areaOnOffButton = domConstruct.create("div", { class: currentState.class }, onOffButtondiv);
            on(areaOnOffButton, "click", lang.hitch(this, function (evt) {
                parameterStatus = this._toggleButtonState(areaOnOffButton, this.config.enableEntireAreaButton, areaOnOffButtonLabel);
                this.config.enableEntireAreaButton = parameterStatus;
            }));
            rendererSortContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, rendererContainer);
            rendererSortInnerContainer = domConstruct.create("div", { "class": "esriParentinner" }, rendererSortContainer);
            rendererSortLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.summaryAttrAscendingOrderTooltip, style: "float:left;margin-right:5px;" }, rendererSortInnerContainer);
            currentClass = this.config.summaryAttributeOrder == "ASC" ? "esriSelectIcon" : "esriDeselectIcon";
            rendererSorttoggle = domConstruct.create("div", { "class": currentClass }, rendererSortInnerContainer);
            on(rendererSorttoggle, "click", lang.hitch(this, function (evt) {
                parameterStatus = this._toggleCheckBoxSate(rendererSorttoggle, this.config.summaryAttributeOrder);
                order = parameterStatus ? "ASC" : "DESC";
                this.config.summaryAttributeOrder = order;
            }));

            //Second column for configuring share dialog
            var shareContainer, shareLabelContainer, shareLabel, sharebuttonContainer, onOffButtonLabel, onOffButton;
            shareContainer = domConstruct.create("div", { class: "esriClear" }, rightSettingsContent);
            shareLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, shareContainer);
            shareLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.shareText }, shareLabelContainer);
            sharebuttonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, shareContainer);
            currentState = this._checkButtonState(this.config.enableShareDialog);
            shareOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, sharebuttonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, sharebuttonContainer);
            shareOnOffButton = domConstruct.create("div", { class: currentState.class }, onOffButtondiv);
            on(shareOnOffButton, "click", lang.hitch(this, function (evt) {
                parameterStatus = this._toggleButtonState(shareOnOffButton, this.config.enableShareDialog, shareOnOffButtonLabel);
                this.config.enableShareDialog = parameterStatus;
            }));


            //Third column for configuring about dialog
            var aboutContainer, aboutLabelContainer, aboutLabelContainer, aboutLabel, aboutButtonContainer, aboutShowContainer,
                aboutShowInnerContainer, rendererSortLabel, rendererSorttoggle;
            aboutContainer = domConstruct.create("div", { class: "esriClear" }, rightSettingsContent);
            aboutLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, aboutContainer);
            aboutLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.aboutText }, aboutLabelContainer);
            aboutButtonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, aboutContainer);
            currentState = this._checkButtonState(this.config.enableAboutDialog);
            aboutOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, aboutButtonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, aboutButtonContainer);
            aboutOnOffButton = domConstruct.create("div", { class: currentState.class }, onOffButtondiv);
            on(aboutOnOffButton, "click", lang.hitch(this, function (evt) {
                parameterStatus = this._toggleButtonState(aboutOnOffButton, this.config.enableAboutDialog, aboutOnOffButtonLabel);
                this.config.enableAboutDialog = parameterStatus;
            }));
            aboutShowContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, aboutContainer);
            aboutShowInnerContainer = domConstruct.create("div", { "class": "esriParentinner" }, aboutShowContainer);
            aboutSortLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.aboutDialogOnLoadText, style: "float:left; margin-right:5px;" }, aboutShowInnerContainer);
            currentClass = this.config.showAboutOnLoad ? "esriSelectIcon" : "esriDeselectIcon";
            abouttoggle = domConstruct.create("div", { "class": currentClass }, aboutShowInnerContainer);
            on(abouttoggle, "click", lang.hitch(this, function (evt) {
                parameterStatus = this._toggleCheckBoxSate(abouttoggle, this.config.showAboutOnLoad);
                this.config.showAboutOnLoad = parameterStatus;
            }));

            //Fourth column for configuring basemap dialog
            var basemapContainer, basemapLabelContainer, basemapLabel, basmapButtonContainer;
            basemapContainer = domConstruct.create("div", { class: "esriClear" }, rightSettingsContent);
            basemapLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1 esriParentContainerStyleClmBrdNone" }, basemapContainer);
            basemapLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.basemapText }, basemapLabelContainer);
            basmapButtonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2 esriParentContainerStyleClmBrdNone" }, basemapContainer);
            currentState = this._checkButtonState(this.config.enableBasemapToggle);
            basemapOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, basmapButtonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, basmapButtonContainer);
            basemapOnOffButton = domConstruct.create("div", { class: currentState.class }, onOffButtondiv);
            on(basemapOnOffButton, "click", lang.hitch(this, function (evt) {
                parameterStatus = this._toggleButtonState(basemapOnOffButton, this.config.enableBasemapToggle, basemapOnOffButtonLabel);
                this.config.enableBasemapToggle = parameterStatus;
            }));
        },

        _createBasemapSelectionPanel: function (settingsContainer) {
            var baseMapSelectionTemplate, basemapSelectionText, currentBaseMapContainer, basemapSiwtchDivContainer, basemapSiwtchDiv,
                basemapSiwtchDivText, basemapText, selectDiv, select, option, buttomcontainer, saveButton;
            baseMapSelectionTemplate = domConstruct.create("div", { "class": "esriBasemapSelection" }, settingsContainer);
            basemapSelectionText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.basemapSelectionText, "class": "esriBasmapSelection" }, baseMapSelectionTemplate);

            currentBaseMapContainer = domConstruct.create("div", { "class": "esriSettingsLeftContent" }, baseMapSelectionTemplate);
            basemapSiwtchDivContainer = domConstruct.create("div", { "class": "esriBasemapSiwtchDivLeft" }, currentBaseMapContainer);
            basemapSiwtchDiv = domConstruct.create("div", { "class": "esriBasemapSiwtchDiv" }, basemapSiwtchDivContainer);
            basemapSiwtchDivText = domConstruct.create("div", { innerHTML: "EMPTY", "class": "esriBasemapSwitchDivText" }, basemapSiwtchDivContainer);

            basemapText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.defaultBasemapText, "class": "esriBasemapSiwtchDivRight" }, currentBaseMapContainer);
            selectDiv = domConstruct.create("div", {}, currentBaseMapContainer);
            select = domConstruct.create("select", {}, selectDiv);
            array.forEach(this.availableBaseMaps, function (defaultBasemap) {
                option = domConstruct.create("option");
                option.label = defaultBasemap;
                option.value = defaultBasemap;
                select.appendChild(option);
            });

            currentBaseMapContainer = domConstruct.create("div", { "class": "esriSettingsRightContent" }, baseMapSelectionTemplate);
            basemapSiwtchDivContainer = domConstruct.create("div", { "class": "esriBasemapSiwtchDivLeft" }, currentBaseMapContainer);
            basemapSiwtchDiv = domConstruct.create("div", { "class": "esriBasemapSiwtchDiv" }, basemapSiwtchDivContainer);
            basemapSiwtchDivText = domConstruct.create("div", { innerHTML: "EMPTY", "class": "esriBasemapSwitchDivText" }, basemapSiwtchDivContainer);

            basemapText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.secondaryBasemapText, "class": "esriBasemapSiwtchDivRight" }, currentBaseMapContainer);
            selectDiv = domConstruct.create("div", {}, currentBaseMapContainer);
            select = domConstruct.create("select", {}, selectDiv);
            array.forEach(this.availableBaseMaps, function (currentBasemap) {
                option = domConstruct.create("option");
                option.label = currentBasemap;
                option.value = currentBasemap;
                select.appendChild(option);
            });
        },

        _checkButtonState: function (isButtonEnabled) {
            var buttonState = {};
            isButtonEnabled ? buttonState.class = "esriOnButton" : buttonState.class = "esriOffButton";
            isButtonEnabled ? buttonState.label = nls.widgets.TemplateBuilder.onButtonLabel : buttonState.label = nls.widgets.TemplateBuilder.offButtonLabel;
            return buttonState;
        },

        _toggleButtonState: function (currentButton, configParameter, buttonLabel) {
            if (domClass.contains(currentButton, "esriOnButton")) {
                domClass.replace(currentButton, "esriOffButton", "esriOnButton");
                domAttr.set(buttonLabel, "innerHTML", nls.widgets.TemplateBuilder.offButtonLabel);
                configParameter = false;
            }
            else {
                domClass.replace(currentButton, "esriOnButton", "esriOffButton");
                domAttr.set(buttonLabel, "innerHTML", nls.widgets.TemplateBuilder.onButtonLabel);
                configParameter = true;
            }
            this.unSavedChanges = true;
            this._displayMessage();
            return configParameter;

        },

        _toggleCheckBoxSate: function (currentCheckBox, configParameter) {
            if (domClass.contains(currentCheckBox, "esriSelectIcon")) {
                domClass.replace(currentCheckBox, "esriDeselectIcon", "esriSelectIcon");
                configParameter = false;
            }
            else {
                domClass.replace(currentCheckBox, "esriSelectIcon", "esriDeselectIcon");
                configParameter = true;
            }
            this.unSavedChanges = true;
            this._displayMessage();
            return configParameter;
        },

        _createPortal: function () {
            // create portal
            var deferred = new Deferred();
            var _self = this, portalURL;
            portalURL = this._getPortalURL();
            this._portal = new portal.Portal(this._getPortalURL());
            // portal loaded
            this.own(on(this._portal, "Load", lang.hitch(this, function () {
                this._portal.signIn().then(function (loggedInUser) {
                    _self.currentUserName = loggedInUser.username;
                    if (_self.config.summaryLayer.id == "") {
                        _self._createConfigurationPanel(true);
                    }
                    deferred.resolve();
                }, function (err) {
                    alert("Sign-in Failed");
                });
            })));
            return deferred.promise;
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this.inherited(arguments);
        },

        //This function internally calls other functions which will create Editable components
        _showEditableUI: function () {
            this._createEditableTitle();
            // this._createCheckBoxPanel();
            //this._createEditableBasemapWidget();
            this._createEditableAreaDescription();
            this._editRendererMenu();
            this._editStatsPanel();
            this._createTooltip();

            topic.subscribe("createEditIcons", (lang.hitch(this, function () {
                this._editStatsPanel();
            })));
        },

        _toggleStatsPanelEditIcon: function () {
            array.forEach(query(".esriStatspanelEditIcon"), lang.hitch(this, function (icon) {
                this._toggleContainer(icon);
            }));
        },

        //function to toggle show/about dialog  container
        _toggleContainer: function (container) {
            var computedStyle = domStyle.getComputedStyle(container);
            var styleDisplay = (computedStyle.display == "none") ? "block" : "none";
            domStyle.set(container, "display", styleDisplay);
        },

        //function to toggle show/about icon header
        _toggleDialog: function (checkIcon, dialog, isShareDialog) {
            if (domClass.contains(checkIcon, "esriCheckIcon")) {
                domClass.replace(checkIcon, "esriUncheckIcon", "esriCheckIcon");
                isShareDialog ? this.config.enableShareDialog = false : this.config.enableAboutDialog = false;

            } else {
                domClass.replace(checkIcon, "esriCheckIcon", "esriUncheckIcon");
                isShareDialog ? this.config.enableShareDialog = true : this.config.enableAboutDialog = true;
            }
            this.unSavedChanges = true;
            this._displayMessage();
        },

        //function to create configuration panel
        _createConfigurationPanel: function (isConfigurationPanel) {
            content = this._createConfigurationPanelUI(isConfigurationPanel);
            if (!this.configDialog) {
                this.configDialog = new Dialog({
                    title: nls.widgets.TemplateBuilder.applicationSettingText,
                    style: "min-width:500",
                    class: "esriDijitDialog",
                    draggable: false
                });
            }
            this.configDialog.setContent(content);
            this.configDialog.show();
        },

        _createConfigurationPanelUI: function (isConfigurationPanel) {
            var variableContainer, fieldsetContainer;
            variableContainer = domConstruct.create("div", { "class": "esriConfigurationPanel" }, null);
            fieldsetContainer = domConstruct.create("div", { "class": "esriFieldsetContainer" }, variableContainer);
            if (isConfigurationPanel) {
                this._createWebmapConfigurationPanel(fieldsetContainer);
            }
            else {
                this._createLayerConfigurationPanel(fieldsetContainer);
            }
            return variableContainer;
        },

        //function to create webmap configuration panel
        _createWebmapConfigurationPanel: function (fieldsetContainer) {
            var legendLabelWebmap, legendLabel, webmapLabel, webmapTextBox, webMapHelpText, variableContainerbutton, innerButtonContainer,
            applicationSettingSaveVariableButton, applicationSettingNextVariableButton;
            legendLabelWebmap = domConstruct.create("div", { "class": "esriLegendLabelDiv" }, fieldsetContainer);
            webmapLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.wemapCaption, "class": "esriSettingsLabel" }, fieldsetContainer);

            webmapTextBox = new TextBox({
                name: "firstname",
                value: this.config.webmap,
                class: "webmapTextBox",
                placeHolder: nls.widgets.TemplateBuilder.webmapTextBoxPlaceholder
            });
            webmapTextBox.placeAt(fieldsetContainer);
            webMapHelpText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.webmapHelperText, "class": "esrWebMapHelpText" }, fieldsetContainer);
            variableContainerbutton = domConstruct.create("div", { "class": "esriButtonConfig" }, fieldsetContainer);
            innerButtonContainer = domConstruct.create("div", { "class": "esriButtonInnerConfig" }, variableContainerbutton);
            applicationSettingSaveVariableButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton" }, innerButtonContainer);
            applicationSettingNextVariableButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.nextButtonText, "class": "esriButton esriButtonColorEnable" }, innerButtonContainer);
            on(applicationSettingSaveVariableButton, "click", lang.hitch(this, function () {
                this._updateItem(false);
            }));
            on(applicationSettingNextVariableButton, "click", lang.hitch(this, function () {
                this._createConfigurationPanel(false);
            }));
        },

        //function to create layer data configuration panel
        _createLayerConfigurationPanel: function (fieldsetContainer) {
            var lagendLabelLayer, layerLabel, layerSelect, sourceLinkLabel, sourceLinkTextBox,
            configurationPanelButtonContainer, innerButtonContainer, configureSaveVariableButton;
            legendLabeldiv = domConstruct.create("div", { "class": "esriLegendLabelDiv" }, fieldsetContainer);
            layerLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.layerLabelText, "class": "esriSettingsLabel" }, legendLabeldiv);
            layerSelect = domConstruct.create("select", { "class": "esriSelect" }, legendLabeldiv);
            var option = domConstruct.create("option");
            option.value = "select Layer";
            option.text = "select Layer";
            layerSelect.appendChild(option);
            for (var i = 0; i < this.map.getLayersVisibleAtScale().length; i++) {
                //allow only feature layer to be added to dropdown
                if ((this.map.getLayersVisibleAtScale()[i].declaredClass == "esri.layers.FeatureLayer")) {
                    var option = domConstruct.create("option");
                    option.value = this.map.getLayersVisibleAtScale()[i].id;
                    option.text = this.map.getLayersVisibleAtScale()[i].name;
                    layerSelect.appendChild(option);
                }
                if (this.config.summaryLayer.id == this.map.getLayersVisibleAtScale()[i].id) {
                    option.selected = "selected";
                }
            }
            if (layerSelect.options.length < 1) {
                var option = domConstruct.create("option");
                option.value = nls.widgets.TemplateBuilder.noLayerFoundText;
                option.text = nls.widgets.TemplateBuilder.noLayerFoundText;
                layerSelect.appendChild(option);
            }
            if (layerSelect.options.length == 1) {
                this.config.summaryLayer.id = layerSelect.value;
            }
            on(layerSelect, "change", lang.hitch(this, function (value) {
                this.config.summaryLayer.id = value.currentTarget.value;
            }));
            configurationPanelButtonContainer = domConstruct.create("div", { "class": "esriButtonConfig" }, fieldsetContainer);
            innerButtonContainer = domConstruct.create("div", { "class": "esriButtonInnerConfig" }, configurationPanelButtonContainer);
            configureSaveVariableButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton" }, innerButtonContainer);
            on(configureSaveVariableButton, "click", lang.hitch(this, function () {
                this._updateItem(false);
            }));
        },

        _createBaseMapSelectPanel: function () {
            var baseMapSelectPanel, currentBaseMapLabel, currentBaseMap, currentBaseMapOption, nextBaseMap;
            baseMapSelectPanel = domConstruct.create("div", { "class": "esriSelectBasemapPanel" }, dojo.body());
            nextBaseMapLabel = domConstruct.create("div", { innerHTML: "Next Basemap" }, baseMapSelectPanel);
            nextBaseMap = domConstruct.create("select", { class: "esriBaseMapSelect" }, baseMapSelectPanel);
            //Loop all the available baesemaps
            array.forEach(this.availableBaseMaps, lang.hitch(this, function (basemap) {
                currentBaseMapOption = domConstruct.create("option");
                currentBaseMapOption.value = basemap;
                currentBaseMapOption.text = basemap;
                if (this.config.nextBasemap == currentBaseMapOption.value) {
                    currentBaseMapOption.selected = true;
                    this.nextBasmapSelectedOption = currentBaseMapOption.value;
                }
                nextBaseMap.appendChild(currentBaseMapOption);
            }));

            on(nextBaseMap, "change", lang.hitch(this, function () {
                this.config.nextBasemap = nextBaseMap.value;
                this.unSavedChanges = true;
                this._displayMessage();
                this.nextBasmapSelectedOption = nextBaseMap.value;
            }));
        },

        //create editable title
        _createEditableTitle: function () {
            var appTitle = dom.byId("title");
            var editTitleIcon = domConstruct.create("div", { "class": "esriEditTitleIcon" }, null);
            domConstruct.place(editTitleIcon, appTitle, "after");
            dojo.connect(editTitleIcon, "onclick", lang.hitch(this, function () {
                domConstruct.empty(appTitle);
                var titleInputBox = domConstruct.create("input", { value: appTitle.title, "class": "esriEditTitleInput" }, appTitle);
                titleInputBox.select();
                on(titleInputBox, "blur", lang.hitch(this, function () {
                    domConstruct.empty(appTitle);
                    if (titleInputBox.value.trim() != "") {
                        appTitle.innerHTML = titleInputBox.value;
                        appTitle.title = appTitle.innerHTML;
                        this.config.title = appTitle.title;
                        this.unSavedChanges = true;
                        this._displayMessage();
                    }
                    else {
                        alert("Application title cannot be EMPTY");
                        appTitle.innerHTML = this.config.title;
                        appTitle.title = appTitle.innerHTML;
                    }
                    domConstruct.place(editTitleIcon, appTitle, "after");
                }));
            }));
        },

        //function to edit basemap toggle widget
        _createEditableBasemapWidget: function () {
            var baseMapDiv, editBasemapIcon;
            baseMapDiv = dom.byId("BasemapToggle");
            editBasemapIcon = domConstruct.create("div", { "class": "esriEditBasemapIcon" }, baseMapDiv);
            domConstruct.place(editBasemapIcon, baseMapDiv, "first");
            this._createBaseMapSelectPanel();
            on(editBasemapIcon, "click", lang.hitch(this, function () {
                this._toggleContainer(query(".esriSelectBasemapPanel")[0]);
            }));
        },

        //function to  edit area description
        _createEditableAreaDescription: function () {
            var areaDescription, editAreaDescriptionIcon, dijitEditorParentDiv;
            if (dom.byId("summary")) {
                areaDescription = dom.byId("summary");
                editAreaDescriptionIcon = domConstruct.create("div", { "class": "editAreaDescriptionIcon" }, null);
                domConstruct.place(editAreaDescriptionIcon, areaDescription, "after");
                dojo.connect(editAreaDescriptionIcon, "onclick", lang.hitch(this, function () {
                    domStyle.set(editAreaDescriptionIcon, "display", "none");
                    var innerText = areaDescription.innerHTML;
                    areaDescription.innerHTML = "";
                    var innerDiv = domConstruct.create("div", {}, null);
                    dijitEditorParentDiv = domConstruct.create("div", {}, areaDescription);
                    dijitInputContainer = new Editor({
                        height: '250px',
                        required: true,
                        plugins: ['bold', 'italic', 'underline', 'createLink'],
                        value: innerText
                    }, dijitEditorParentDiv);
                    dijitInputContainer.startup();
                    on(dijitInputContainer, "Blur", lang.hitch(this, function () {
                        domStyle.set(editAreaDescriptionIcon, "display", "block");
                        var innerText = dijitInputContainer.get("value").trim();
                        domConstruct.empty(areaDescription);
                        domAttr.set(areaDescription, "innerHTML", innerText);
                        this.config.summary = innerText;
                    }));
                }));
            }
        },

        //edit impact area renderers
        _editRendererMenu: function () {
            if (this.config.summaryAttributeOrder != "DESC") {
                var rendererList = query(".menu-list")[0].getElementsByTagName("li");
                var i = rendererList.length;
                while (i--) {
                    if (!domClass.contains(rendererList[i], "summarize")) {
                        query(".menu-list")[0].appendChild(rendererList[i]);
                    }
                }
            }
        },

        //function to  edit stats panel blocks
        _editStatsPanel: function () {
            var editpanelButton, statsPanel;
            statsPanel = query(".panel .count");
            array.forEach(statsPanel, lang.hitch(this, function (panel, index) {
                domAttr.set(panel, "nodeIndex", index);
                on(panel, "click", lang.hitch(this, function (evt) {
                    evt.stopPropagation();
                    if (query(".esriDataContainer").length) {
                        domConstruct.destroy(query(".esriDataContainer")[0]);
                    }
                    //create panel which will allow user to add/update stats panel configuration
                    this._createVariablePanel(evt.currentTarget);
                }));
            }));
        },

        //function to create variable panel to add/update stats panel configuration
        _createVariablePanel: function (editpanelButton) {
            var parentAttributeName, populateSubVariables = false, currentNodeIndex, variableContainer, variableContent, closebtnContainer, labelContainer,
            selectLabel, variableName, inputContainer, slectInputContainer, selectInput, variableInputContainer, variableInput, parentVariableOption,
            soureLinkContainer, sourceLinkLabel, soureLinkInputContainer, sourceLinkInputContent, sourceLinkInput, subVariableContainer,
            subVariableLabel, subVariableInputContainer, subVariableContentContainer, buttonContainer, buttonSaveButton, subVariablePanelAnchor;

            currentNodeIndex = domAttr.get(editpanelButton, "nodeIndex");
            variableContainer = domConstruct.create("div", { "class": "esriDataContainer" }, query(".content-pane-center")[0], "last");
            variableContent = domConstruct.create("div", { "class": "esriVariableContentContainer" }, variableContainer);
            closebtnContainer = domConstruct.create("div", { class: "esriVarPanelCloseButton icon-cancel-1", title: "Cancel" }, variableContent);
            on(closebtnContainer, "click", function () {
                domConstruct.destroy(variableContainer);
            });

            labelContainer = domConstruct.create("div", { class: "esriVariableContainer" }, variableContent);
            selectLabel = domConstruct.create("div", { class: "esriVariableContent", innerHTML: nls.widgets.TemplateBuilder.selectVariableText }, labelContainer);
            variableName = domConstruct.create("div", { class: "esriVariableContent", innerHTML: nls.widgets.TemplateBuilder.label }, labelContainer);

            inputContainer = domConstruct.create("div", { class: "esriVariableContainer" }, variableContent);
            slectInputContainer = domConstruct.create("div", { class: "esriVariableContent" }, inputContainer);
            selectInput = domConstruct.create("select", { class: "esriVariableSelect" }, slectInputContainer);
            parentVariableOption = domConstruct.create("option");
            parentVariableOption.value = "Select Variable";
            parentVariableOption.text = "Select Variable";
            selectInput.appendChild(parentVariableOption);
            on(selectInput, "change", lang.hitch(this, function (evt) {
                array.forEach(this.map.getLayer(this.config.summaryLayer.id).fields, lang.hitch(this, function (currentField) {
                    if (currentField.name == evt.currentTarget.value) {
                        query(".esriVariableSelectInput")[0].value = currentField.alias;
                    }
                }));
                if (evt.currentTarget.value == "Select Variable") {
                    domConstruct.empty(subVariableContentContainer);
                    query(".esriVariableSelectInput")[0].value = "Enter Label";
                    domClass.replace(buttonSaveButton, "esriButtonDisabled", "esriButtonEnabled" + currentNodeIndex);
                    if (domClass.contains(buttonSaveButton, "esriButtonDisabled")) {
                        domStyle.set(delteButtonDiv, "display", "none");
                    }
                    else {
                        domStyle.set(delteButtonDiv, "display", "block");
                    }
                    buttonSaveButton.disabled = true;
                    return;
                }
                else {
                    domClass.replace(buttonSaveButton, "esriButtonEnabled" + currentNodeIndex, "esriButtonDisabled");
                    if (domClass.contains(buttonSaveButton, "esriButtonDisabled")) {
                        domStyle.set(delteButtonDiv, "display", "none");
                    }
                    else {
                        domStyle.set(delteButtonDiv, "display", "block");
                    }
                    buttonSaveButton.disabled = false;
                }
                domConstruct.empty(subVariableContentContainer);
                this._populateSubVariables(subVariableContentContainer, currentNodeIndex, evt.currentTarget.value);
            }));

            //populate all fields of layer and append it to dropdown
            array.forEach(this.map.getLayer(this.config.summaryLayer.id).fields, lang.hitch(this, function (currentField) {
                parentVariableOption = domConstruct.create("option");
                parentVariableOption.value = currentField.name;
                parentVariableOption.text = currentField.name;
                selectInput.appendChild(parentVariableOption);
                if (this.config.summaryAttributes[currentNodeIndex].attribute == currentField.name) {
                    parentVariableOption.selected = "selected";
                    parentAttributeName = this.config.summaryAttributes[currentNodeIndex].label;
                    populateSubVariables = true;
                }
            }));
            variableInputContainer = domConstruct.create("div", { class: "esriVariableContent" }, inputContainer);
            variableInput = domConstruct.create("input", { class: "esriVariableSelectInput", value: parentAttributeName ? parentAttributeName : "Enter Label" }, variableInputContainer);

            soureLinkContainer = domConstruct.create("div", { class: "esriVariableContainer" }, variableContent);
            sourceLinkLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.sourceLinkText }, soureLinkContainer);

            soureLinkInputContainer = domConstruct.create("div", { class: "esriVariableContainer" }, variableContent);
            sourceLinkInputContent = domConstruct.create("div", { class: "esriSourceLink" }, soureLinkInputContainer);
            sourceLinkInput = domConstruct.create("input", { class: "esriSourceLinkInput", value: this.config.summaryAttributes[currentNodeIndex].dataSourceUrl }, sourceLinkInputContent);

            subVariableContainer = domConstruct.create("div", { class: "esriVariableContainer" }, variableContent);
            subVariableLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.selectSubVariableText }, subVariableContainer);

            subVariableInputContainer = domConstruct.create("div", { class: "esriVariableContainer" }, variableContent);
            subVariableContentContainer = domConstruct.create("div", { class: "esrisubVariableContent" }, subVariableInputContainer);
            if (populateSubVariables) {
                this._populateSubVariables(subVariableContentContainer, currentNodeIndex, this.config.summaryAttributes[currentNodeIndex].attribute);
            }

            buttonContainer = domConstruct.create("div", { class: "esriSubVariableButtonContainer" }, variableContent);
            populateSubVariables ? buttonState = false : buttonState = true;
            buttonState ? buttonClass = "esriButtonDisabled" : buttonClass = "esriButtonEnabled" + currentNodeIndex;
            if (buttonClass == "esriButtonDisabled") {
                buttonVisibilty = "none";
            }
            else {
                buttonVisibilty = "block";
            }
            delteButtonDiv = domConstruct.create("div", { class: "esriClearButton", innerHTML: "Clear Data" }, buttonContainer);
            domStyle.set(delteButtonDiv, "display", buttonVisibilty);
            buttonSaveButton = domConstruct.create("button", { "style": "float:right", class: "esriButton " + buttonClass, innerHTML: nls.widgets.TemplateBuilder.subVariablePanelButtonText, disabled: buttonState }, buttonContainer);

            on(buttonSaveButton, "click", lang.hitch(this, function () {
                this._saveStatsPanelState(currentNodeIndex);
                domConstruct.destroy(variableContainer);
            }));
            on(delteButtonDiv, "click", lang.hitch(this, function () {
                alert(nls.widgets.TemplateBuilder.resetVariableMessage);
                domConstruct.destroy(variableContainer);
            }));

            subVariablePanelAnchor = domConstruct.create("div", { "class": "esriDownArrow" }, variableContainer);
            this._setAnchorPosition(currentNodeIndex);
        },

        //function to populate sub variables and allow users to add/update the same
        _populateSubVariables: function (subVariableContentContainer, currentNodeIndex, parentAttributeName) {
            var count = 0;
            array.forEach(this.map.getLayer(this.config.summaryLayer.id).fields, lang.hitch(this, function (currentField, index) {
                var subVariableContentDiv, subVariableContentFirstDiv, checkBox, subVariableContentSecondDiv, label,
                subVariableContentThirdDiv, inputText, checkBoxStatusClass;
                checkBoxStatusClass = "esriUncheckIcon";
                if (parentAttributeName != currentField.name) {
                    for (var i = 0; i < this.config.summaryAttributes[currentNodeIndex].children.length; i++) {
                        if (currentField.name == this.config.summaryAttributes[currentNodeIndex].children[i].attribute) {
                            checkBoxStatusClass = "esriCheckIcon";
                            currentField.alias = this.config.summaryAttributes[currentNodeIndex].children[i].label;
                            break;
                        }
                    }
                    count % 2 != 0 ? className = "esriRowEvenColor" : className = "";
                    subVariableContentDiv = domConstruct.create("div", { "class": "esriSubVariableContainer" }, subVariableContentContainer);
                    subVariableContentFirstDiv = domConstruct.create("div", { "class": " esriSubVariable esriFirstColumn " + className }, subVariableContentDiv);
                    checkBox = domConstruct.create("div", { class: "esriCheckBoxIcon" + " " + checkBoxStatusClass }, subVariableContentFirstDiv);
                    domAttr.set(checkBox, "index", count);
                    subVariableContentSecondDiv = domConstruct.create("div", { "class": " esriSubVariable esriSecondColumn " + className }, subVariableContentDiv);
                    label = domConstruct.create("label", { class: "esriVariableLabel", innerHTML: currentField.name }, subVariableContentSecondDiv);
                    domAttr.set(label, "index", count);
                    subVariableContentThirdDiv = domConstruct.create("div", { "class": " esriSubVariable esriThirdColumn " + className }, subVariableContentDiv);
                    inputText = domConstruct.create("input", { class: "esriVariableInput" }, subVariableContentThirdDiv);
                    domAttr.set(inputText, "index", count);
                    inputText.value = currentField.alias;
                    count++;
                    on(checkBox, "click", function (evt) {
                        if (domClass.contains(checkBox, "esriCheckIcon")) {
                            domClass.replace(checkBox, "esriUncheckIcon", "esriCheckIcon");
                        }
                        else {
                            domClass.replace(checkBox, "esriCheckIcon", "esriUncheckIcon");
                        }
                        var totalSubVariable = query(".esriCheckBoxIcon.esriCheckIcon").length;
                        if (totalSubVariable > 25) {
                            domClass.replace(evt.currentTarget, "esriUncheckIcon", "esriCheckIcon");
                            alert("You cannot select more than 25 subvariables");
                        }
                    });
                }
            }));
        },

        //funtion to save stats panel configuration
        _saveStatsPanelState: function (currentNodeIndex) {
            var subVariables, columnIndex, parentAttribute, variableSourceLink, parentAttributeLabel, subVariableAttribute, subVariableLabel;
            subVariables = query(".esriCheckBoxIcon.esriCheckIcon");
            parentAttribute = query(".esriVariableSelect")[0].value;
            parentAttributeLabel = query(".esriVariableSelectInput")[0].value;
            variableSourceLink = query(".esriSourceLinkInput")[0].value;

            this.config.summaryAttributes[currentNodeIndex].attribute = parentAttribute;
            this.config.summaryAttributes[currentNodeIndex].label = parentAttributeLabel;
            this.config.summaryAttributes[currentNodeIndex].dataSourceUrl = variableSourceLink;
            this.config.summaryAttributes[currentNodeIndex].children = [];
            //loop selected sub variables and save them
            array.forEach(subVariables, lang.hitch(this, function (currentCheckdField) {
                columnIndex = domAttr.get(currentCheckdField, "index");
                subVariableAttribute = query(".esriVariableInput")[columnIndex].value; ;
                subVariableLabel = query(".esriVariableLabel")[columnIndex].innerText;
                this.config.summaryAttributes[currentNodeIndex].children.push({ "attribute": subVariableLabel, "label": subVariableAttribute });
            }));
            this.unSavedChanges = true;
            this._displayMessage();
        },

        //function to set anchor point for variable panel
        _setAnchorPosition: function (editIconIndex) {
            switch (editIconIndex) {
                case "0":
                    domStyle.set(query(".esriDownArrow")[0], "marginLeft", "12.5%");
                    break;
                case "1":
                    domStyle.set(query(".esriDownArrow")[0], "marginLeft", "36%");
                    break;
                case "2":
                    domStyle.set(query(".esriDownArrow")[0], "marginLeft", "61%");
                    break;
                default:
                    domStyle.set(query(".esriDownArrow")[0], "marginLeft", "86%");
            }
        },

        _displayMessage: function () {
            if (domStyle.get(query(".esriSaveButtonContainer")[0], "display") == "none" || this.unSavedChanges) {
                domStyle.set(query(".esriSaveButtonContainer")[0], "display", "block");
            }
            else {
                domStyle.set(query(".esriSaveButtonContainer")[0], "display", "none");
            }
        },

        //function to update item on AGOL with changed configuration settings
        _updateItem: function (isRollBackRequired, newURL) {
            //Here we are using the response,so we dont need to create whole item again.
            //we are just modifying required parameters.
            isRollBackRequired ? this.config = this.previousConfigObj : this.config = this.config;
            delete this.config["i18n"];
            var text = lang.mixin(this.response.itemData.values, this.config);
            this.response.item.tags = typeof (this.response.item.tags) == "object" ? this.response.item.tags.join(',') : this.response.item.tags;
            this.response.item.typeKeywords = typeof (this.response.item.typeKeywords) == "object" ? this.response.item.typeKeywords.join(',') : this.response.item.typeKeywords;
            var rqData = lang.mixin(this.response.item, {
                id: this.config.appid,
                item: this.config.appid,
                itemType: "text",
                f: 'json',
                title: "My Mapping Application",
                text: JSON.stringify(this.response.itemData),
                type: "Web Mapping Application",
                overwrite: true
            });
            updateUrl = string.substitute(this.updateItemURL, { username: this.currentUserName, appid: this.config.appid });
            esriRequest({
                url: updateUrl,
                content: rqData,
                handleAs: 'json'
            }, { usePost: true }).then(lang.hitch(this, function (result) {
                if (result.success) {
                    alert("Item Updated");
                    if (!isRollBackRequired) {
                        location.reload();
                    }
                }
            }), function (err) {
                alert("Failed");
            });
        },

        _getPortalURL: function () {
            return arcgisUtils.arcgisUrl.split('/sharing/')[0];
        },

        _createTooltip: function () {
            var _this = this;
            var myTooltipDialog = new TooltipDialog({
                id: 'tooltipDialog',
                style: "max-width: 200px; font-size: 12px;",
                onMouseLeave: function (evt) {
                    popup.close(myTooltipDialog);
                }
            });
            //tooltip for About dialog
            on(dom.byId('AboutDialog'), "mouseover", function () {
                var aboutDialogContent, label, aboutOnOfButton, aboutLoadtext, onLoadCheckIcon;
                aboutDialogContent = domConstruct.create("div", { "class": "esriTooltipDialog" }, null);
                currentState = _this._checkButtonState(_this.config.enableAboutDialog);
                aboutlabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriFloatLeftStyle esriToggleButtonClass" }, aboutDialogContent);
                aboutOnOfButton = domConstruct.create("div", { class: "esriFloatLeftStyle " + currentState.class }, aboutDialogContent);
                aboutLoadtext = domConstruct.create("div", { innerHTML: "On Load", "class": "esriFloatLeftlabel" }, aboutDialogContent);
                currentClass = _this.config.showAboutOnLoad ? "esriSelectIcon" : "esriDeselectIcon";
                onLoadCheckIcon = domConstruct.create("div", { class: "esriFloatLeftStyle " + currentClass, "style": "margin-left:5px;" }, aboutDialogContent);
                on(aboutOnOfButton, "click", function (evt) {
                    parameterStatus = _this._toggleButtonState(aboutOnOfButton, _this.config.enableAboutDialog, aboutlabel);
                    _this.config.enableAboutDialog = parameterStatus;
                });
                on(onLoadCheckIcon, "click", lang.hitch(this, function (evt) {
                    parameterStatus = _this._toggleCheckBoxSate(onLoadCheckIcon, _this.config.showAboutOnLoad);
                    _this.config.showAboutOnLoad = parameterStatus;
                }));
                _this._displayTooltip(myTooltipDialog, aboutDialogContent, this);
            });
            //tooltip for Share dialog
            on(dom.byId('ShareDialog'), "mouseover", function () {
                var shareDialogContent, sharelabel, shareOnOfButton;
                shareDialogContent = domConstruct.create("div", { "class": "esriTooltipDialog" }, null);
                currentState = _this._checkButtonState(_this.config.enableShareDialog);
                sharelabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriFloatLeftStyle esriToggleButtonClass" }, shareDialogContent);
                shareOnOfButton = domConstruct.create("div", { class: "esriFloatLeftStyle " + currentState.class }, shareDialogContent);
                on(shareOnOfButton, "click", function (evt) {
                    parameterStatus = _this._toggleButtonState(shareOnOfButton, _this.config.enableShareDialog, sharelabel);
                    _this.config.enableShareDialog = parameterStatus;
                });
                _this._displayTooltip(myTooltipDialog, shareDialogContent, this);
            });
            //tooltip for basemap
            on(dom.byId('BasemapToggle'), "mouseover", function () {
                var basemapContent, basemapLabel, basemapOnOfButton, basmeapPencilIcon;
                basemapContent = domConstruct.create("div", { "class": "esriTooltipDialog" }, null);
                currentState = _this._checkButtonState(_this.config.enableBasemapToggle);
                basemapLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriFloatLeftStyle esriToggleButtonClass" }, basemapContent);
                basemapOnOfButton = domConstruct.create("div", { class: "esriFloatLeftStyle " + currentState.class }, basemapContent);
                basmeapPencilIcon = domConstruct.create("div", { "class": "esriEditBasemapIcon esriFloatLeftStyle" }, basemapContent);
                on(basemapOnOfButton, "click", function (evt) {
                    parameterStatus = _this._toggleButtonState(basemapOnOfButton, _this.config.enableBasemapToggle, basemapLabel);
                    _this.config.enableBasemapToggle = parameterStatus;
                });
                _this._displayTooltip(myTooltipDialog, basemapContent, this);
            });

            on(dom.byId('renderer_menu'), "mouseover", function () {
            });
        },

        //function to show tooltip on hover
        _displayTooltip: function (myTooltipDialog, content, parentNode) {
            myTooltipDialog.setContent(content);
            popup.open({
                popup: myTooltipDialog,
                around: parentNode,
                orient: ["below-centered"]
            });
        }
        /* ---------------- */
        /* Public Events */
        /* ---------------- */

        /* ---------------- */
        /* Public Functions */
        /* ---------------- */


    });
    return Widget;
});
