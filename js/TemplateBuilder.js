define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/layout/ContentPane",
    "dojo/dom",
    "dojo/on",
    "dojo/number",
    "dojo/string",
    "dojo/query",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dijit/Dialog",
    "esri/request",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/i18n!application/nls/TemplateBuilder",
    "dojo/topic",
    "dojo/keys",
    "dijit/Editor",
    "dijit/TooltipDialog",
    "dijit/popup",
    "dojo/aspect",
    "dijit/_editor/plugins/LinkDialog",
    "application/BrowseIdDlg",
    "application/EnrichLayer",
    "esri/basemaps",
    "esri/arcgis/utils"
],
function (
    declare,
    lang,
    _WidgetBase,
    ContentPane,
    dom, on, number, string, query, array, domConstruct, domClass, Dialog, esriRequest, domAttr, domStyle, nls, topic, keys, Editor, TooltipDialog, popup, aspect, LinkDialog, BrowseIdDlg, EnrichLayer, esriBasemaps, arcgisUtils) {
    var Widget = declare([_WidgetBase], {
        declaredClass: "application.TemplateBuilder",
        //URL for updating Item
        availableThemes: ["dark", "light"],
        unSavedChanges: false,
        previousConfigObj: null,
        configDialog: null,
        browseDlg: null,
        webMapConfiguration: null,
        aoiLayer: null,
        entireAreaPrevState: null,
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
            this.webMapConfiguration = defaults.config.itemInfo;
            this.previousConfigObj = lang.mixin({}, defaults.config);
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
            // place node in body
            // top content pane
            var builderContentPane = new ContentPane({
                region: "top"
            }, builderNode);
            // add pane to border container
            this.get("drawer")._borderContainer.addChild(builderContentPane);
            this.get("drawer").resize();
            var bulilderModeHelpText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.builderModeHelpText, "class": this.css.rootContainer }, builderNode);
            this.aoiLayer = this.map.getLayer(this.config.summaryLayer.id);
            // resize border container
            if (this.config.edit) {
                this._showBuilderMode(builderNode);
            }
            else {
                //show button to allow user to enter builder mode
                domAttr.set(bulilderModeHelpText, "innerHTML", nls.widgets.TemplateBuilder.enterBuilderModeHelpText);
                var buttonContainer = domConstruct.create("div", { "class": "esriButtonContainer" }, builderNode);
                var switchTOBuilderModeButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.enterBuilderButtonText, "class": "esriButton" }, buttonContainer);
                on(switchTOBuilderModeButton, "click", function () {
                    var newURL = location.href + "&edit=true";
                    window.location.href = newURL;
                });
            }
            this._loadCSS();
            setTimeout(lang.hitch(this, function () {
                this.get("drawer").resize();
            }), 200);
            this.entireAreaPrevState = this.config.enableEntireAreaButton;
            this.enrichLayer = new EnrichLayer({ map: this.map, userInfo: this.userInfo, config: this.config, webmapInfo: this.webMapConfiguration });
        },

        _loadCSS: function () {
            //Load claro css
            if (dom.byId("claroTheme")) {
                domAttr.set(dom.byId("claroTheme"), "href", location.protocol + "//js.arcgis.com/3.15/dijit/themes/claro/claro.css");
            }
            domClass.add(document.body, "claro");
            //Load browser dialog
            var cssStyle = document.createElement('link');
            cssStyle.rel = 'stylesheet';
            cssStyle.type = 'text/css';
            cssStyle.href = "css/browseDialog.css";
            document.getElementsByTagName('head')[0].appendChild(cssStyle);
        },

        _showBuilderMode: function (builderNode) {
            var buttonContainer, dataConfigurationButton, appSettingConfigurationButton, previewModeButton, saveButtonContainer,
            applicationSettingSaveButton, unsavedChangesText, browseParams;
            buttonContainer = domConstruct.create("div", { "class": "esriButtonContainer" }, builderNode);
            dataConfigurationButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.dataConfigurationButtonText, "class": "esriButton" }, buttonContainer);
            appSettingConfigurationButton = domConstruct.create("button", { "style": "margin-left:10px;", "class": "esriButton", innerHTML: nls.widgets.TemplateBuilder.applicationSettingText }, buttonContainer);
            previewModeButton = domConstruct.create("button", { "style": "margin-left:10px;", "class": "esriButton", innerHTML: nls.widgets.TemplateBuilder.exitBuilderButtonText }, buttonContainer);
            saveButtonContainer = domConstruct.create("div", { "class": "esriSaveButtonContainer" }, builderNode);
            applicationSettingSaveButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton esriSaveButton" }, saveButtonContainer);
            unsavedChangesText = domConstruct.create("div", { "class": "esriUnsavedChanges", innerHTML: nls.widgets.TemplateBuilder.alertMessage.unsavedChangesMessage }, saveButtonContainer);
            on(applicationSettingSaveButton, "click", lang.hitch(this, function () {
                domAttr.set(unsavedChangesText, "innerHTML", nls.widgets.TemplateBuilder.savingChangesMessage);
                this._updateItem(false);
            }));
            on(dataConfigurationButton, "click", lang.hitch(this, function () {
                this._createConfigurationPanel(true);
            }));
          
          // open webmap config if default webmap
          if(!this.config.webmap || this.config.webmap === "21633896293248b7a40d4e3126c93621"){
            this._createConfigurationPanel(true);
          }

            on(appSettingConfigurationButton, "click", lang.hitch(this, function () {
                this._createAppSettingsPanel();
            }));

            on(previewModeButton, "click", lang.hitch(this, function () {
                var isSaveRequire, currentURL, newURL, firstIndex, nextIndex, editSubstring;
                if (location.href.search("&edit") == -1) {
                    firstIndex = location.href.search("edit");
                    nextIndex = location.href.search("&");
                    if (nextIndex == -1) {
                        currentURL = location.href.split("?edit");
                        newURL = currentURL[0];
                    } else {
                        editSubstring = location.href.slice(firstIndex, nextIndex + 1);
                        newURL = location.href.replace(editSubstring, "");
                    }
                } else {
                    firstIndex = location.href.search("&edit");
                    nextIndex = location.href.lastIndexOf("&");
                    if (firstIndex !== nextIndex) {
                        editSubstring = location.href.slice(firstIndex, nextIndex);
                        newURL = location.href.replace(editSubstring, "");
                    } else {
                        currentURL = location.href.split("&edit");
                        newURL = currentURL[0];
                    }
                }

                this.previousConfigObj.edit = "";
                if (this.unSavedChanges) {
                    isSaveRequire = confirm(nls.widgets.TemplateBuilder.alertMessage.saveChangesAlert);
                }
                if (isSaveRequire)
                    this._updateItem(false, newURL);
                else
                    this._updateItem(true, newURL);
            }));

            this._showEditableUI();
            browseParams = {
                portal: this.userInfo.portal,
                galleryType: "webmap" //valid values are webmap or group
            };
            this.browseDlg = new BrowseIdDlg(browseParams, this.userInfo);
            on(this.browseDlg, "close", lang.hitch(this, function () {
                if (this.browseDlg.get("selected") !== null && this.browseDlg.get("selectedWebmap") !== null) {
                    var currentWebmapTitle = string.substitute(nls.widgets.TemplateBuilder.loadMapMessage, { webmapTitle: this.browseDlg.get("selected") });
                    domAttr.set(query(".selectMapMessage")[0], "innerHTML", currentWebmapTitle);
                    if (this.browseDlg.get("selectedWebmap") != this.config.webmap) {
                        this.config.webmap = this.browseDlg.get("selectedWebmap");
                        domAttr.set(query(".esriNextButton")[0], "disabled", true);
                        domClass.replace(query(".esriNextButton")[0], "esriButtonDisabled", "esriButtonColorEnable");
                    }
                }
            }));
            if (this.config.summaryLayer.id === "") {
                this._createConfigurationPanel(false);
            }
        },

        /* This section creates Application setting dialog which will be used to configureentire application at one go */
        //function to create Application settigns panel
        //function creates Left,Right,Basemap and Bottom panel
        _createAppSettingsPanel: function () {
            var settingsContainer;
            settingsContainer = domConstruct.create("div", { "class": "esriAppSettingPanelContainer" }, null);
            this._storeCurrentAppSetting();
            this._createAppSettingsLeftPanel(settingsContainer);
            this._createAppSettingsRightPanel(settingsContainer);
            this._createAppSettingBottomPanel(settingsContainer);
        },

        //Store required settings into object which will be used to maintain the stat of application
        _storeCurrentAppSetting: function () {
            this.appSetting = {};
            this.appSetting.title = this.config.title;
            this.appSetting.summary = this.config.summary;
            this.appSetting.enableEntireAreaButton = this.config.enableEntireAreaButton;
            this.appSetting.selectEntireAreaOnStart = this.config.selectEntireAreaOnStart;
            this.appSetting.summaryAttributeOrder = this.config.summaryAttributeOrder;
            this.appSetting.enableShareDialog = this.config.enableShareDialog;
            this.appSetting.enablePopupDialog = this.config.enablePopupDialog;
            this.appSetting.enableBasemapToggle = this.config.enableBasemapToggle;
            this.appSetting.nextBasemap = this.config.nextBasemap;
            this.appSetting.defaultBasemap = this.config.defaultBasemap;
            this.appSetting.enableAboutPanel = this.config.enableAboutPanel;
            this.appSetting.enableRendererArea = this.config.enableRendererArea;
            this.appSetting.enableLegendPanel = this.config.enableLegendPanel;
            this.appSetting.enableLayersPanel = this.config.enableLayersPanel;
            this.appSetting.theme = this.config.theme;
            this.appSetting.zoomType = this.config.zoomType;
            this.appSetting.featuresTransparency = this.config.featuresTransparency;
            this.appSetting.featureCurrentTransparency = this.config.featureCurrentTransparency;

        },

        //Revert application settigns with previously stored object if user clicks cancel button
        _revertGlobalAppSetting: function () {
            for (var key in this.appSetting) {
                if (this.appSetting.hasOwnProperty(key)) {
                    this.config[key] = this.appSetting[key];
                }
                if (key === "enableEntireAreaButton" && this.config.enableEntireAreaButton) {
                    this.entireAreaPrevState = this.appSetting[key];
                    domClass.replace(this.areaOnOffButton, "esriOnButton", "esriOffButton");
                    domAttr.set(this.areaOnOffButtonLabel, "innerHTML", nls.widgets.TemplateBuilder.onButtonLabel);
                    this.config.enableEntireAreaButton = true;
                }
            }
        },

        _createAppSettingsLeftPanel: function (settingsContainer) {
            var leftSettingsContent, appTitleLabelContainer, appTitleLabel, appTitleInputContainer, appTitleInput,
            appDescriptionLabelContainer, appDescriptionLabel, appDescriptionInputContainer, appDijitInputContainer, dijitValue;

            leftSettingsContent = domConstruct.create("div", { "class": "esriSettingsLeftContent" }, settingsContainer);
            appTitleLabelContainer = domConstruct.create("div", { "class": "esriClear" }, leftSettingsContent);
            appTitleLabel = domConstruct.create("label", { innerHTML: nls.widgets.TemplateBuilder.appSettingsTitleText }, appTitleLabelContainer);
            appTitleInputContainer = domConstruct.create("div", { "class": "esriClear" }, leftSettingsContent);
            appTitleInput = domConstruct.create("input", { "style": "width:89%;", value: this.config.title || this.response.itemData.values.title }, appTitleInputContainer);
            on(appTitleInput, "blur", lang.hitch(this, function () {
                if (lang.trim(appTitleInput.value) === "") {
                    alert(nls.widgets.TemplateBuilder.alertMessage.emptyAppTitleMessage);
                    appTitleInput.value = dom.byId("title").innerHTML;
                }
                else {
                    this.config.title = domAttr.get(appTitleInput, "value");
                }
            }));
            appDescriptionLabelContainer = domConstruct.create("div", { "class": "esriClear" }, leftSettingsContent);
            appDescriptionLabel = domConstruct.create("label", { innerHTML: nls.widgets.TemplateBuilder.appSettingsDescriptionText }, appDescriptionLabelContainer);
            appDescriptionInputContainer = domConstruct.create("div", { "class": "esriClear" }, leftSettingsContent);
            dijitValue = this.config.summary ? this.config.summary : " ";
            appDijitInputContainer = this._createTextEditor(appDescriptionInputContainer, dijitValue);
            appDijitInputContainer.onLoadDeferred.then(lang.hitch(this, function () {
                setTimeout(function () {
                    appDijitInputContainer.execCommand('selectAll');
                    appDijitInputContainer.execCommand('fontName', "Lato ,sans-serif");
                }, 300);
            }));
            on(appDijitInputContainer, "change", lang.hitch(this, function (evt) {
                if (lang.trim(evt) !== "") {
                    setTimeout(lang.hitch(this, function () {
                        this.config.summary = lang.trim(evt);
                    }), 0);
                }
                else {
                    alert(nls.widgets.TemplateBuilder.alertMessage.emptyDescriptionMessage);
                    appDijitInputContainer.set("value", lang.trim(appDijitInputContainer.value));
                }
            }));
            this._createAppSettingBasemapPanel(leftSettingsContent);
        },

        _createAppSettingsRightPanel: function (settingsContainer) {
            var rightSettingsContent = domConstruct.create("div", { "class": "esriSettingsRightContent" }, settingsContainer);
            //create Rendererd Area column
            this._createFirstColumn(rightSettingsContent);
            //create share dialog column
            this._createSecondColumn(rightSettingsContent);
            this._createPopupColumn(rightSettingsContent);
            //Create basemap column
            this._createThirdColumn(rightSettingsContent);
            //Create builder settings to toggle Entire Area
            this._createEntireAreaToggleButton(rightSettingsContent);
            //Create builder settings to toggle About Panel
            this._createAboutPanel(rightSettingsContent);
            //Create builder settings to toggle Legend Panel
            this._createLegendPanel(rightSettingsContent);
            //Create builder settings to toggle Layers Panel
            this._createLayersPanel(rightSettingsContent);
            //Create builder settings to switch between light and dark theme
            this._createFourthColumn(rightSettingsContent);
            this._createZoomLevelSelectionPanel(rightSettingsContent);
            if (this.aoiLayer && this.aoiLayer.geometryType !== "esriGeometryPoint") {
                this._createFeatureSelectionPanel(rightSettingsContent);
            }
        },

        _createAppSettingBasemapPanel: function (settingsContainer) {
            var baseMapSelectionTemplate, basemapSelectionText, defaultBaseMapContainer, secondaryBasemapContainer, basemapSwitchDivContainer,
                nextBasemapSwitchDivText, nextBasemapSelect, defaultBasemapSelect, defaultBasemapSiwtchDiv, defaultBasemapSiwtchDivText,
                nextBasemapSwitchDiv, basemapText, selectDiv, style;
            style = this.config.enableBasemapToggle ? "visible" : "hidden";
            baseMapSelectionTemplate = domConstruct.create("div", { "class": "esriBasemapSelection", "style": "visibility:" + style }, settingsContainer);
            basemapSelectionText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.basemapSelectionText, "class": "esriBasmapSelection" }, baseMapSelectionTemplate);

            defaultBaseMapContainer = domConstruct.create("div", { "class": "defaultBaseMapLeftContent" }, baseMapSelectionTemplate);
            basemapSwitchDivContainer = domConstruct.create("div", { "class": "esriBasemapSwitchDivLeft" }, defaultBaseMapContainer);
            defaultBasemapSiwtchDiv = domConstruct.create("div", { "class": "esriBasemapSwitchDiv esriBasicBasemapStyle " + "esri" + this.config.defaultBasemap }, basemapSwitchDivContainer);
            defaultBasemapSiwtchDivText = domConstruct.create("div", { innerHTML: this.config.defaultBasemap, "class": "esriBasemapSwitchDivText" }, basemapSwitchDivContainer);

            basemapText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.defaultBasemapText, "class": "esriBasemapSwitchDivRight" }, defaultBaseMapContainer);
            selectDiv = domConstruct.create("div", {}, defaultBaseMapContainer);
            defaultBasemapSelect = domConstruct.create("select", {}, selectDiv);
            this.own(on(defaultBasemapSelect, "change", lang.hitch(this, function (evt) {
                if (nextBasemapSelect.value != evt.currentTarget.value) {
                    this._setBasemap(defaultBasemapSiwtchDiv, evt.currentTarget.value, defaultBasemapSiwtchDivText);
                    this.config.defaultBasemap = evt.currentTarget.value;
                }
                else {
                    defaultBasemapSelect.value = this.config.defaultBasemap;
                }
            })));
            this._createBasemapMenu(defaultBasemapSelect, this.config.defaultBasemap, defaultBasemapSiwtchDiv, defaultBasemapSiwtchDivText);

            secondaryBasemapContainer = domConstruct.create("div", { "class": "" }, baseMapSelectionTemplate);
            basemapSwitchDivContainer = domConstruct.create("div", { "class": "esriBasemapSwitchDivLeft" }, secondaryBasemapContainer);
            nextBasemapSwitchDiv = domConstruct.create("div", { "class": "esriBasemapSwitchDiv esriBasicBasemapStyle " + "esri" + this.config.nextBasemap }, basemapSwitchDivContainer);
            nextBasemapSwitchDivText = domConstruct.create("div", { innerHTML: this.config.nextBasemap, "class": "esriBasemapSwitchDivText" }, basemapSwitchDivContainer);

            basemapText = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.secondaryBasemapText, "class": "esriBasemapSwitchDivRight" }, secondaryBasemapContainer);
            selectDiv = domConstruct.create("div", {}, secondaryBasemapContainer);
            nextBasemapSelect = domConstruct.create("select", {}, selectDiv);
            this.own(on(nextBasemapSelect, "change", lang.hitch(this, function (evt) {
                if (defaultBasemapSelect.value != evt.currentTarget.value) {
                    this._setBasemap(nextBasemapSwitchDiv, evt.currentTarget.value, nextBasemapSwitchDivText);
                    this.config.nextBasemap = evt.currentTarget.value;
                }
                else {
                    nextBasemapSelect.value = this.config.nextBasemap;
                }
            })));
            this._createBasemapMenu(nextBasemapSelect, this.config.nextBasemap, nextBasemapSwitchDiv, nextBasemapSwitchDivText);
        },

        _createAppSettingBottomPanel: function (settingsContainer) {
            var bottomcontainer, botomInnerContainer, saveButton, cancelButton, settingsDialog;
            bottomcontainer = domConstruct.create("div", { "class": "esriAppSettingBottomContainer" }, settingsContainer);
            botomInnerContainer = domConstruct.create("div", { "style": "float:right" }, bottomcontainer);
            saveButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton esriAppSettingButton" }, botomInnerContainer);
            cancelButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.cancel, "class": "esriButton esriAppSettingButton" }, botomInnerContainer);

            on(saveButton, "click", lang.hitch(this, function () {
                if (settingsDialog) {
                    settingsDialog.destroy();
                }
                this.unSavedChanges = true;
                this._displayMessage();
                setTimeout(lang.hitch(this, function () {
                    domAttr.set(dom.byId("title"), "innerHTML", this.config.title);
                    domAttr.set(dom.byId("title"), "title", this.config.title);
                    domAttr.set(dom.byId("summary"), "innerHTML", this.config.summary);
                        if (query(".editAreaDescriptionButtonContainer")[0] && domStyle.get(query(".editAreaDescriptionButtonContainer")[0], "display") == "block") {
                            domStyle.set(query(".editAreaDescriptionButtonContainer")[0], "display", "none");
                            domStyle.set(query(".editAreaDescriptionIcon")[0], "display", "block");
                        }
                }), 0);
            }));

            on(cancelButton, "click", lang.hitch(this, function () {
                if (query(".icon-share")[0]) this._disableComponent(this.appSetting.enableShareDialog, query(".icon-share")[0]);
                if (query(".BasemapToggle")[0]) this._disableComponent(this.appSetting.enableBasemapToggle, query(".BasemapToggle")[0]);
                if (settingsDialog) {
                    settingsDialog.destroy();
                }
                this._revertGlobalAppSetting();
                domAttr.set(dom.byId("title"), "innerHTML", this.appSetting.title);
                domAttr.set(dom.byId("summary"), "innerHTML", this.appSetting.summary);
                if (query(".editAreaDescriptionButtonContainer")[0]) {
                    if (domStyle.get(query(".editAreaDescriptionButtonContainer")[0], "display") == "block") {
                        domStyle.set(query(".editAreaDescriptionButtonContainer")[0], "display", "none");
                        domStyle.set(query(".editAreaDescriptionIcon")[0], "display", "block");
                    }
                }
            }));
            //create dialog and show entire application settings
            settingsDialog = new Dialog({
                title: nls.widgets.TemplateBuilder.applicationSettingText,
                "style": "min-width:700px !important",
                "class": "esriDijitDialog",
                draggable: false
            });
            on(settingsDialog, "hide", lang.hitch(this, function () {
                if (query(".icon-share")[0]) this._disableComponent(this.appSetting.enableShareDialog, query(".icon-share")[0]);
                if (query(".BasemapToggle")[0]) this._disableComponent(this.appSetting.enableBasemapToggle, query(".BasemapToggle")[0]);
                this._revertGlobalAppSetting();
                settingsDialog.destroy();
            }));
            settingsDialog.setContent(settingsContainer);
            settingsDialog.show();
        },

        _createFirstColumn: function (rightSettingsContent) {
            var rendererContainer, rendererLabelContainer, rendererLabel, rendererbuttonContainer, onOffButtondiv,
                currentState, currentClass, parameterStatus, areaOnOffButtonLabel, areaOnOffButton, rendererSortContainer, rendererSortInnerContainer, rendererSortLabel,
                rendererSorttoggle;

            rendererContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            rendererLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, rendererContainer);
            rendererLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.appSetingsRendererAreaText }, rendererLabelContainer);
            rendererbuttonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, rendererContainer);
            currentState = this._checkButtonState(this.config.enableRendererArea);
            areaOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, rendererbuttonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, rendererbuttonContainer);
            areaOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(areaOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(areaOnOffButton, this.config.enableRendererArea, areaOnOffButtonLabel);
                this.config.enableRendererArea = parameterStatus;
                if (parameterStatus === false) {
                    if (domClass.contains(this.areaOnOffButton, "esriOnButton")) {
                        domClass.replace(this.areaOnOffButton, "esriOffButton", "esriOnButton");
                        domAttr.set(this.areaOnOffButtonLabel, "innerHTML", nls.widgets.TemplateBuilder.offButtonLabel);
                        this.config.enableEntireAreaButton = false;
                    }
                } else {
                    if (this.entireAreaPrevState) {
                        domClass.replace(this.areaOnOffButton, "esriOnButton", "esriOffButton");
                        domAttr.set(this.areaOnOffButtonLabel, "innerHTML", nls.widgets.TemplateBuilder.onButtonLabel);
                        this.config.enableEntireAreaButton = true;
                    }
                }
            }));
            rendererSortContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, rendererContainer);
            rendererSortInnerContainer = domConstruct.create("div", { "class": "esriParentinner" }, rendererSortContainer);
            rendererSortLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.summaryAttrAscendingOrderTooltip, "style": "float:left;margin-right:5px;" }, rendererSortInnerContainer);
            currentClass = this.config.summaryAttributeOrder == "ASC" ? "esriSelectIcon" : "esriDeselectIcon";
            rendererSorttoggle = domConstruct.create("div", { "class": currentClass }, rendererSortInnerContainer);
            on(rendererSorttoggle, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleCheckBoxSate(rendererSorttoggle, this.config.summaryAttributeOrder, areaOnOffButton);
                var order = parameterStatus ? "ASC" : "DESC";
                this.config.summaryAttributeOrder = order;
            }));
        },

        _createSecondColumn: function (rightSettingsContent) {
            var shareContainer, shareLabelContainer, shareLabel, sharebuttonContainer, parameterStatus,
            currentState, shareOnOffButtonLabel, onOffButtondiv, shareOnOffButton;
            shareContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            shareLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, shareContainer);
            shareLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.shareText }, shareLabelContainer);
            sharebuttonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, shareContainer);
            currentState = this._checkButtonState(this.config.enableShareDialog);
            shareOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, sharebuttonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, sharebuttonContainer);
            shareOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(shareOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(shareOnOffButton, this.config.enableShareDialog, shareOnOffButtonLabel);
                this.config.enableShareDialog = parameterStatus;
                if (query(".icon-share")[0]) {
                    this._disableComponent(parameterStatus, query(".icon-share")[0]);
                }
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, shareContainer);
        },
        _createPopupColumn: function (rightSettingsContent) {
            var popupContainer, popupLabelContainer, popupLabel, popupButtonContainer, parameterStatus,
            currentState, popupOnOffButtonLabel, onOffButtondiv, popupOnOffButton;
            popupContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            popupLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, popupContainer);
            popupLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.popupText }, popupLabelContainer);
            popupButtonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, popupContainer);
            currentState = this._checkButtonState(this.config.enablePopupDialog);
            popupOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, popupButtonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, popupButtonContainer);
            popupOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(popupOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(popupOnOffButton, this.config.enablePopupDialog, popupOnOffButtonLabel);
                this.config.enablePopupDialog = parameterStatus;
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, popupContainer);
        },
        _createThirdColumn: function (rightSettingsContent) {
            var basemapContainer, basemapLabelContainer, basemapLabel, basmapButtonContainer, parameterStatus, currentState,
            basemapOnOffButtonLabel, basemapOnOffButton, onOffButtondiv;
            basemapContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            basemapLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1 " }, basemapContainer);
            basemapLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.basemapText }, basemapLabelContainer);
            basmapButtonContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, basemapContainer);
            currentState = this._checkButtonState(this.config.enableBasemapToggle);
            basemapOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, basmapButtonContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, basmapButtonContainer);
            basemapOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(basemapOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(basemapOnOffButton, this.config.enableBasemapToggle, basemapOnOffButtonLabel);
                this.config.enableBasemapToggle = parameterStatus;
                if (query(".BasemapToggle")[0]) {
                    this._disableComponent(parameterStatus, query(".BasemapToggle")[0]);
                }
                if (!parameterStatus) {
                    query(".esriBasemapSelection")[0].style.visibility = "hidden";
                }
                else {
                    query(".esriBasemapSelection")[0].style.visibility = "visible";
                }
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, basemapContainer);
        },

        _createEntireAreaToggleButton: function (rightSettingsContent) {
            var entireAreaContainer, entireAreaLabelContainer, entireAreaLabel, entireAreaBtnContainer, onOffButtondiv, currentClass, onStartToggle,
                currentState, parameterStatus, onStartContainer, onStartInnerContainer, onStartLabel;

            entireAreaContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            entireAreaLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, entireAreaContainer);
            entireAreaLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.entireAreaButton }, entireAreaLabelContainer);
            entireAreaBtnContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, entireAreaContainer);
            currentState = this._checkButtonState(this.config.enableEntireAreaButton);
            this.areaOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, entireAreaBtnContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, entireAreaBtnContainer);
            this.areaOnOffButton = domConstruct.create("div", { "class": currentState.class, "id": "entireAreaBtn" }, onOffButtondiv);
            on(this.areaOnOffButton, "click", lang.hitch(this, function () {
                if (this.config.enableRendererArea) {
                    parameterStatus = this._toggleButtonState(this.areaOnOffButton, this.config.enableEntireAreaButton, this.areaOnOffButtonLabel);
                    this.entireAreaPrevState = parameterStatus;
                    this.config.enableEntireAreaButton = parameterStatus;
                }
            }));
            onStartContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, entireAreaContainer);
            onStartInnerContainer = domConstruct.create("div", { "class": "esriParentinner" }, onStartContainer);
            onStartLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.onStartLabel, "style": "float:left;margin-right:5px;" }, onStartInnerContainer);
            currentClass = this.config.selectEntireAreaOnStart ? "esriSelectIcon" : "esriDeselectIcon";
            onStartToggle = domConstruct.create("div", { "class": currentClass }, onStartInnerContainer);
            on(onStartToggle, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleCheckBoxSate(onStartToggle, this.config.selectEntireAreaOnStart, this.areaOnOffButton);
                this.config.selectEntireAreaOnStart = parameterStatus;
            }));
        },

        _createAboutPanel: function (rightSettingsContent) {
            var aboutPanelContainer, aboutPanelLabelContainer, aboutPanelLabel, aboutPanelBtnContainer, onOffButtondiv,
                currentState, areaOnOffButtonLabel, areaOnOffButton, parameterStatus;

            aboutPanelContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            aboutPanelLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, aboutPanelContainer);
            aboutPanelLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.aboutPanel }, aboutPanelLabelContainer);
            aboutPanelBtnContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, aboutPanelContainer);
            currentState = this._checkButtonState(this.config.enableAboutPanel);
            areaOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, aboutPanelBtnContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, aboutPanelBtnContainer);
            areaOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(areaOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(areaOnOffButton, this.config.enableAboutPanel, areaOnOffButtonLabel);
                this.config.enableAboutPanel = parameterStatus;
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, aboutPanelContainer);
        },

        _createLegendPanel: function (rightSettingsContent) {
            var legendPanelContainer, legendPanelLabelContainer, legendPanelLabel, legendPanelBtnContainer, onOffButtondiv,
                currentState, areaOnOffButtonLabel, areaOnOffButton, parameterStatus;

            legendPanelContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            legendPanelLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, legendPanelContainer);
            legendPanelLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.legendPanel }, legendPanelLabelContainer);
            legendPanelBtnContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, legendPanelContainer);
            currentState = this._checkButtonState(this.config.enableLegendPanel);
            areaOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, legendPanelBtnContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, legendPanelBtnContainer);
            areaOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(areaOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(areaOnOffButton, this.config.enableLegendPanel, areaOnOffButtonLabel);
                this.config.enableLegendPanel = parameterStatus;
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, legendPanelContainer);
        },

        _createLayersPanel: function (rightSettingsContent) {
            var layersPanelContainer, layersPanelLabelContainer, layersPanelLabel, layersPanelBtnContainer, onOffButtondiv,
                currentState, areaOnOffButtonLabel, areaOnOffButton, parameterStatus;

            layersPanelContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            layersPanelLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, layersPanelContainer);
            layersPanelLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.layersPanel }, layersPanelLabelContainer);
            layersPanelBtnContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, layersPanelContainer);
            currentState = this._checkButtonState(this.config.enableLayersPanel);
            areaOnOffButtonLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriOnOffButtonLabel" }, layersPanelBtnContainer);
            onOffButtondiv = domConstruct.create("div", { "class": "esriOnOffButtonDiv" }, layersPanelBtnContainer);
            areaOnOffButton = domConstruct.create("div", { "class": currentState.class }, onOffButtondiv);
            on(areaOnOffButton, "click", lang.hitch(this, function () {
                parameterStatus = this._toggleButtonState(areaOnOffButton, this.config.enableLayersPanel, areaOnOffButtonLabel);
                this.config.enableLayersPanel = parameterStatus;
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, layersPanelContainer);
        },

        _createFourthColumn: function (rightSettingsContent) {
            var themeContainer, themeLabelContainer, themeLabel, themeSelectContainer, themeSelect;
            themeContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            themeLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, themeContainer);
            themeLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.theme }, themeLabelContainer);
            themeSelectContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, themeContainer);
            themeSelect = domConstruct.create("select", { "class": "themeSelect" }, themeSelectContainer);
            array.forEach(this.availableThemes, lang.hitch(this, function (theme) {
                var themeOption = domConstruct.create("option");
                themeOption.text = themeOption.value = theme;
                if (this.config.theme == theme) {
                    themeOption.selected = "selected";
                }
                themeSelect.appendChild(themeOption);
            }));
            this.own(on(themeSelect, "change", lang.hitch(this, function (evt) {
                this.config.theme = evt.currentTarget.value;
            })));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, themeContainer);
        },

        _createZoomLevelSelectionPanel: function (rightSettingsContent) {
            var zoomLevelContainer, zoomLevelLabelContainer, zoomLevelLabel, themeSelectContainer, zoomLevelSelect;
            zoomLevelContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            zoomLevelLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, zoomLevelContainer);
            zoomLevelLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.zoomLevel }, zoomLevelLabelContainer);
            themeSelectContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2" }, zoomLevelContainer);
            zoomLevelSelect = domConstruct.create("select", { "class": "esriZoomSelect" }, themeSelectContainer);
            var zoomToExtentOption = domConstruct.create("option");
            zoomToExtentOption.text = zoomToExtentOption.value = "Zoom to extent";
            zoomLevelSelect.appendChild(zoomToExtentOption);
          
            var noneOption = domConstruct.create("option");
            noneOption.text = noneOption.value = "None";
            zoomLevelSelect.appendChild(noneOption);
          
            var noZoomOption = domConstruct.create("option");
            noZoomOption.text = noZoomOption.value = "Center";
            zoomLevelSelect.appendChild(noZoomOption);
            if (this.config.zoomType == "Zoom to extent") {
                zoomToExtentOption.selected = "selected";
            } else {
                noZoomOption.selected = "selected";
            }
            array.forEach(this.map.getLayer(this.map.layerIds[0]).tileInfo.lods, lang.hitch(this, function (lod, level) {
                var number = this._decPlaces(lod.scale);
                var zoomToLOD = domConstruct.create("option");
                zoomToLOD.text = "1: " + number + " (level" + level + ")";
                zoomToLOD.value = lod.scale;
                zoomLevelSelect.appendChild(zoomToLOD);
                if (this.config.zoomType == lod.scale) {
                    zoomToLOD.selected = "selected";
                }
            }));
            on(zoomLevelSelect, "change", lang.hitch(this, function (evt) {
                this.config.zoomType = evt.currentTarget.value;
            }));
            domConstruct.create("div", { "class": "esriParentContainerStyleClm3" }, zoomLevelContainer);
        },

        _createFeatureSelectionPanel: function (rightSettingsContent) {
            var featureTransparentOptionContainer, featureTransparentLabelContainer, featureTransparentLabel, transparentOptionsContainer, transparentSelect;
            featureTransparentOptionContainer = domConstruct.create("div", { "class": "esriClear" }, rightSettingsContent);
            featureTransparentLabelContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm1" }, featureTransparentOptionContainer);
            featureTransparentLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.SelectedFeatureText }, featureTransparentLabelContainer);
            transparentOptionsContainer = domConstruct.create("div", { "class": "esriParentContainerStyleClm2 esriParentContainerStyleClmBrdNone" }, featureTransparentOptionContainer);
            transparentSelect = domConstruct.create("select", { "class": "esriZoomSelect" }, transparentOptionsContainer);
            array.forEach(this.config.featuresTransparency, lang.hitch(this, function (transparent) {
                var transparentOption = domConstruct.create("option");
                transparentOption.text = transparent.label;
                transparentOption.value = transparent.value;
                transparentSelect.appendChild(transparentOption);
                if (this.config.featureCurrentTransparency == transparent.label) {
                    transparentOption.selected = "selected";
                }
            }));
            on(transparentSelect, "change", lang.hitch(this, function (evt) {
                this.config.featureCurrentTransparency = this.config.featuresTransparency[evt.currentTarget.selectedIndex].label;
            }));
        },

        //function to create and return text editor
        _createTextEditor: function (appDescriptionInputContainer, dijitValue) {
            var dijitInputContainer;
            dijitInputContainer = new Editor({
                height: '250px',
                required: true,
                plugins: ['bold', 'italic', 'underline', 'createLink', 'removeFormat'],
                value: dijitValue
            }, appDescriptionInputContainer);
            dijitInputContainer.startup();
            return dijitInputContainer;
        },

        //function to fill dropdown with all available basemaps
        _createBasemapMenu: function (basemapSelect, configuredBasemap, basemapImage, basemapLabel) {
            for (var basemapKey in esriBasemaps) {
                var basemapOption = domConstruct.create("option");
                basemapOption.text = esriBasemaps[basemapKey].title;
                basemapOption.value = basemapKey;
                if (basemapOption.value == configuredBasemap) {
                    this._setBasemap(basemapImage, basemapOption.value, basemapLabel);
                    basemapOption.selected = "selected";
                }
                basemapSelect.appendChild(basemapOption);
            }
        },  

        /*End of Application settings dialog*/

        _setBasemap: function (domNode, currentValue, basemapLabel) {
            domStyle.set(domNode, "background", 'url(' + esriBasemaps[currentValue].thumbnailUrl + ') no-repeat center center');
            domAttr.set(basemapLabel, "innerHTML", esriBasemaps[currentValue].title);
        },

        //function to check button state
        _checkButtonState: function (isButtonEnabled) {
            var buttonState = {};
            if (isButtonEnabled) {
                buttonState.class = "esriOnButton";
                buttonState.label = nls.widgets.TemplateBuilder.onButtonLabel;
            }
            else {
                buttonState.class = "esriOffButton";
                buttonState.label = nls.widgets.TemplateBuilder.offButtonLabel;
            }
            return buttonState;
        },

        //function to toggle button state
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

        //function to toggle checkBox state
        _toggleCheckBoxSate: function (currentCheckBox, configParameter, paramterStatusButton) {
            if (domClass.contains(paramterStatusButton, "esriOnButton")) {
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
            }
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this.inherited(arguments);
        },

        //This function internally calls other functions which will create Editable components
        _showEditableUI: function () {
            this._createEditableTitle();
            this._createEditableAreaDescription();
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
            var computedStyle, styleDisplay;
            computedStyle = domStyle.getComputedStyle(container);
            styleDisplay = (computedStyle.display == "none") ? "block" : "none";
            domStyle.set(container, "display", styleDisplay);
        },


        _createConfigurationPanel: function (isConfigurationPanel) {
            this.dijitClickHandler.resume();
            //Function internally create configuration panel for webmap or layer
            var content = this._createConfigurationPanelUI(isConfigurationPanel);
            if (!this.configDialog) {
                this.configDialog = new Dialog({
                    title: "Data Configuration",
                    "style": "min-width:500",
                    "class": "esriDijitDialog",
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

        //webmap configuration panel for users to select and add new webmap into application
        _createWebmapConfigurationPanel: function (fieldsetContainer) {
            var webmapTitle, variableContainerBtn, innerButtonContainer,
            saveWebmapBtn, webmapNextBtn;
            webmapTitle = domConstruct.create("div", { innerHTML: string.substitute(nls.widgets.TemplateBuilder.selectMapMessage, { displaying: "displaying", webmapTitle: this.map.webmapTitle }), "class": "selectMapMessage" }, fieldsetContainer);

            var selectWebmapBtn = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.changeWebmap, "class": "esriButton", "style": "float: right;" }, fieldsetContainer);
            on(selectWebmapBtn, "click", lang.hitch(this, function () {
                this.browseDlg.show();
            }));
            variableContainerBtn = domConstruct.create("div", { "class": "esriButtonConfig" }, fieldsetContainer);
            innerButtonContainer = domConstruct.create("div", { "class": "esriButtonInnerConfig" }, variableContainerBtn);
            saveWebmapBtn = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton esriSpaceStyle" }, innerButtonContainer);
            webmapNextBtn = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.webmapNextButtonText, "class": "esriButton esriButtonColorEnable esriNextButton" }, innerButtonContainer);
            on(saveWebmapBtn, "click", lang.hitch(this, function () {
                var variableAttributes = {};
                this.config.summaryAttributes = [];
                for (var i = 0; i < 4; i++) {
                    variableAttributes.attribute = "";
                    variableAttributes.label = "Add Variable";
                    variableAttributes.dataSourceUrl = "";
                    variableAttributes.children = {};
                    this.config.summaryAttributes.push(variableAttributes);
                    this.config.summaryLayer.id = "";
                }
                var newURL = location.href.split('&webmap');
                if (newURL.length >= 2) {
                    newURL = newURL[0] + "&edit=true";
                }
                this._updateItem(false, newURL);
            }));
            on(webmapNextBtn, "click", lang.hitch(this, function () {
                this._createConfigurationPanel(false);
            }));
        },

        //Populate all featurelayer into dropdown and allow user to change the impact layer
        _createLayerConfigurationPanel: function (fieldsetContainer) {
          var helperServices = lang.mixin({}, this.userInfo.portal.helperServices, this.config.helperServices);
            var layerLabel, layerSelect, layerSelectOption, configurePreviousVariableButton, layerHelperText, legendLabeldiv,
                configurationPanelButtonContainer, innerButtonContainer, configureSaveVariableButton, configurationPanelToggleContainer,
                configurationPanelToggleContent, existingValueButton, enrichLayerContainer, enrichLayerButton, enrichLayerImageContainer;
            legendLabeldiv = domConstruct.create("div", { "class": "esriLegendLabelDiv" }, fieldsetContainer);
            layerLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.layerLabelText, "class": "esriSettingsLabel" }, legendLabeldiv);
            layerSelect = domConstruct.create("select", { "class": "esriSelect" }, legendLabeldiv);
            layerHelperText = domConstruct.create("div", { "class": "esriLayerHelpText", innerHTML: nls.widgets.TemplateBuilder.layerHelpTextMessage }, fieldsetContainer);
            layerSelectOption = domConstruct.create("option");
            layerSelectOption.value = "";
            layerSelectOption.text = nls.widgets.TemplateBuilder.selectLayer;
            layerSelect.appendChild(layerSelectOption);
            configurationPanelToggleContainer = domConstruct.create("div", { "class": "configurationPanelToggleContainer" }, fieldsetContainer);
            configurationPanelToggleContent = domConstruct.create("div", { "class": "configurationPanelToggleContent" }, configurationPanelToggleContainer);
            existingValueButton = domConstruct.create("div", { "class": "esriDeselectIcon" }, configurationPanelToggleContent);
            for (var i = 0; i < this.map.getLayersVisibleAtScale().length; i++) {
                if ((this.map.getLayersVisibleAtScale()[i].declaredClass == "esri.layers.FeatureLayer")) {
                    layerSelectOption = domConstruct.create("option");
                    layerSelectOption.value = this.map.getLayersVisibleAtScale()[i].id;
                    layerSelectOption.text = this.map.getLayersVisibleAtScale()[i].name;
                    layerSelect.appendChild(layerSelectOption);
                }
                if (this.config.summaryLayer.id == this.map.getLayersVisibleAtScale()[i].id) {
                    layerSelectOption.selected = "selected";
                    domStyle.set(configurationPanelToggleContainer, "display", "block");
                }
            }
            if (layerSelect.options.length < 1) {
                layerSelectOption = domConstruct.create("option");
                layerSelectOption.value = nls.widgets.TemplateBuilder.noLayerFoundText;
                layerSelectOption.text = nls.widgets.TemplateBuilder.noLayerFoundText;
                layerSelect.appendChild(layerSelectOption);
            }
            if (layerSelect.options.length == 1) {
                this.config.summaryLayer.id = layerSelect.value;
            }
            on(layerSelect, "change", lang.hitch(this, function (value) {
                this.layerSelected = true;
                this.config.summaryLayer.id = value.currentTarget.value;
                var variableAttributes = {};
                this.config.summaryAttributes = [];
                for (var i = 0; i < 4; i++) {
                    variableAttributes.attribute = "";
                    variableAttributes.label = "Add Variable";
                    variableAttributes.dataSourceUrl = "";
                    variableAttributes.children = {};
                    this.config.summaryAttributes.push(variableAttributes);
                }
                if (this.config.summaryLayer.id === "") {
                    domAttr.set(configureSaveVariableButton, "disabled", true);
                    domClass.add(configureSaveVariableButton, "esriButtonDisabled");
                }
                else {
                    domAttr.set(configureSaveVariableButton, "disabled", false);
                    domClass.remove(configureSaveVariableButton, "esriButtonDisabled");
                }
                if (helperServices.analysis) {
                    //show option to enrich layer on layer select
                    if (value.currentTarget.value !== "") {
                        domStyle.set(configurationPanelToggleContainer, "display", "block");
                        if (domClass.contains(enrichLayerButton, 'esriSelectIcon')) {
                            domStyle.set(enrichLayerImageContainer, "display", "block");
                        }
                    } else {
                        domStyle.set(configurationPanelToggleContainer, "display", "none");
                        domStyle.set(enrichLayerImageContainer, "display", "none");

                    }
                }
                else {
                    if (value.currentTarget.value !== "") {
                        domStyle.set(configurationPanelToggleContainer, "display", "block");
                    }
                    else {
                        domStyle.set(configurationPanelToggleContainer, "display", "none");
                    }
                }
            }));
            domConstruct.create("div", { "class": "existingValueLabel", "innerHTML": nls.widgets.TemplateBuilder.existingValue }, configurationPanelToggleContent);
            if (helperServices.analysis) {
                enrichLayerContainer = domConstruct.create("div", { "class": "configurationPanelToggleContent" }, configurationPanelToggleContainer);
                enrichLayerButton = domConstruct.create("div", { "class": "esriSelectIcon" }, enrichLayerContainer);
                domAttr.set(enrichLayerButton, "checked", true);
                domConstruct.create("div", { "class": "enrichLayerLabel", "innerHTML": nls.widgets.TemplateBuilder.enrichLayer }, enrichLayerContainer);
                enrichLayerImageContainer = domConstruct.create("div", { "class": "displayNone" }, fieldsetContainer);
                domConstruct.create("div", { "class": "enrichLayerImage" }, enrichLayerImageContainer);
                domConstruct.create("div", { "class": "enrichLayerLink", "innerHTML": nls.widgets.TemplateBuilder.imageLabel }, enrichLayerImageContainer);
                on(enrichLayerImageContainer, 'click', lang.hitch(this, function () {
                    window.open("http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/GeoEnrichment_Service_Overview/02r30000021r000000/");
                }));
            }
            configurationPanelButtonContainer = domConstruct.create("div", { "class": "esriButtonConfig" }, fieldsetContainer);
            innerButtonContainer = domConstruct.create("div", { "class": "esriButtonInnerConfig" }, configurationPanelButtonContainer);
            configurePreviousVariableButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.previousButtonText, "class": "esriPreviousButton esriButton" }, innerButtonContainer);
            configureSaveVariableButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButtonDisabled esriButton", "disabled": true }, innerButtonContainer);
            on(existingValueButton, 'click', lang.hitch(this, function (evt) {
                if (domClass.contains(evt.currentTarget, 'esriDeselectIcon')) {
                    domClass.replace(evt.currentTarget, 'esriSelectIcon', 'esriDeselectIcon');
                    domClass.replace(enrichLayerButton, 'esriDeselectIcon', 'esriSelectIcon');
                    domAttr.set(configureSaveVariableButton, "innerHTML", nls.widgets.TemplateBuilder.saveButtonText);
                    domAttr.set(evt.currentTarget, "checked", true);
                    domAttr.set(enrichLayerButton, "checked", false);
                }
            }));
            if (helperServices.analysis) {
                domAttr.set(configureSaveVariableButton, "innerHTML", nls.widgets.TemplateBuilder.nextButtonText);
                on(enrichLayerButton, 'click', lang.hitch(this, function (evt) {
                    if (domClass.contains(evt.currentTarget, 'esriDeselectIcon')) {
                        domClass.replace(evt.currentTarget, 'esriSelectIcon', 'esriDeselectIcon');
                        domClass.replace(existingValueButton, 'esriDeselectIcon', 'esriSelectIcon');
                        domAttr.set(configureSaveVariableButton, "innerHTML", nls.widgets.TemplateBuilder.nextButtonText);
                        domAttr.set(evt.currentTarget, "checked", true);
                        domAttr.set(existingValueButton, "checked", false);
                    }
                }));
            }
            on(configureSaveVariableButton, "click", lang.hitch(this, function () {
                if (domAttr.get(existingValueButton, "checked")) {
                    this._updateItem(false);
                } else if (domAttr.get(enrichLayerButton, "checked")) {
                    this.dijitClickHandler.pause();
                    this.enrichLayer.startup(this.layerSelected);
                    this.layerSelected = false;
                    aspect.after(this.enrichLayer, "_showPreviousDialog", lang.hitch(this, function () {
                        this._createConfigurationPanel(false);
                    }));
                    aspect.after(this.enrichLayer, "_completeProcess", lang.hitch(this, function () {
                        this._updateItem(false);
                    }));
                    this.configDialog.hide();
                }
            }));
            on(configurePreviousVariableButton, "click", lang.hitch(this, function () {
                this._createConfigurationPanel(true);
            }));
            if (this.config.summaryLayer.id) {
                domClass.remove(configureSaveVariableButton, "esriButtonDisabled");
                configureSaveVariableButton.disabled = false;
                if (helperServices.analysis) {
                    domStyle.set(enrichLayerImageContainer, 'display', 'block');
                }
            }
            if (layerSelect.value === "") {
                domAttr.set(configureSaveVariableButton, "disabled", true);
                domClass.add(configureSaveVariableButton, "esriButtonDisabled");
            }
            if (!helperServices.analysis) {
                domClass.replace(existingValueButton, 'esriSelectIcon', 'esriDeselectIcon');
                domAttr.set(existingValueButton, "checked", true);
            }
        },


        //create editable title
        _createEditableTitle: function () {
            var appTitle = dom.byId("title");
            var editTitleIcon = domConstruct.create("div", { "class": "esriEditTitleIcon" }, null);
            domConstruct.place(editTitleIcon, appTitle, "after");
            on(editTitleIcon, "click", lang.hitch(this, function () {
                domConstruct.empty(appTitle);
                var titleInputBox = domConstruct.create("input", { value: this.config.title, "class": "esriEditTitleInput" }, appTitle);
                titleInputBox.select();
                on(titleInputBox, "blur", lang.hitch(this, function () {
                    this._saveAppTitle(appTitle, titleInputBox, editTitleIcon);
                }));
                on(titleInputBox, "keypress", lang.hitch(this, function (evt) {
                    if (evt.charCode == keys.ENTER) {
                        this._saveAppTitle(appTitle, titleInputBox, editTitleIcon);
                    }
                }));
            }));
        },

        _saveAppTitle: function (appTitle, titleInputBox, editTitleIcon) {
            domConstruct.empty(appTitle);
            if (lang.trim(titleInputBox.value) !== "") {
                appTitle.innerHTML = titleInputBox.value;
                appTitle.title = appTitle.innerHTML;
                this.config.title = appTitle.title;
                this.unSavedChanges = true;
                this._displayMessage();
            }
            else {
                alert(nls.widgets.TemplateBuilder.alertMessage.emptyAppTitleMessage);
                appTitle.innerHTML = this.config.title;
                appTitle.title = appTitle.innerHTML;
            }
            domConstruct.place(editTitleIcon, appTitle, "after");
        },

        //Allows user to edit area description with dojo rich text editor
        _createEditableAreaDescription: function () {
            var areaDescription, editAreaDescriptionIcon, dijitEditorParentDiv, editAreaDescriptionButtonContainer,
            dijitInputContainer, editAreaDescriptionButton;
            if (dom.byId("summary")) {
                areaDescription = dom.byId("summary");
                editAreaDescriptionIcon = domConstruct.create("div", { "class": "editAreaDescriptionIcon" }, null);
                editAreaDescriptionButtonContainer = domConstruct.create("div", { "class": "editAreaDescriptionButtonContainer" }, null);
                editAreaDescriptionButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.subVariablePanelButtonText, "class": "esriButton editAreaDescriptionButton" }, editAreaDescriptionButtonContainer);
                domConstruct.place(editAreaDescriptionIcon, areaDescription, "after");
                on(editAreaDescriptionIcon, "click", lang.hitch(this, function () {
                    domStyle.set(editAreaDescriptionIcon, "display", "none");
                    domStyle.set(editAreaDescriptionButtonContainer, "display", "block");
                    domConstruct.place(editAreaDescriptionButtonContainer, areaDescription, "after");
                    var innerText = areaDescription.innerHTML;
                    areaDescription.innerHTML = "";
                    dijitEditorParentDiv = domConstruct.create("div", {}, areaDescription);
                    dijitInputContainer = this._createTextEditor(dijitEditorParentDiv, innerText);
                }));
                on(editAreaDescriptionButton, "click", lang.hitch(this, function () {
                    this._saveAppDescription(dijitInputContainer, editAreaDescriptionIcon, editAreaDescriptionButtonContainer, areaDescription);
                }));
            }
        },

        _saveAppDescription: function (dijitInputContainer, editAreaDescriptionIcon, editAreaDescriptionButtonContainer, areaDescription) {
            if (dijitInputContainer.get("value") !== "") {
                domConstruct.empty(areaDescription);
                var innerText = lang.trim(dijitInputContainer.get("value"));
                domStyle.set(editAreaDescriptionIcon, "display", "block");
                domStyle.set(editAreaDescriptionButtonContainer, "display", "none");
                domAttr.set(areaDescription, "innerHTML", innerText);
                this.config.summary = innerText;
                this.unSavedChanges = true;
                this._displayMessage();
            }
            else {
                alert(nls.widgets.TemplateBuilder.alertMessage.emptyDescriptionMessage);
                dijitInputContainer.set("value", dijitInputContainer.value);
            }
        },

        //edit and confiure stats panel
        _editStatsPanel: function () {
            var statsPanel, currentNodeIndex;
            statsPanel = query(".panel .count");
            array.forEach(statsPanel, lang.hitch(this, function (panel, index) {
                domAttr.set(panel, "nodeIndex", index);
                domStyle.set(panel, "cursor", "pointer");
                on(panel, "click", lang.hitch(this, function (evt) {
                    evt.stopPropagation();
                    if (query(".esriDataContainer").length) {
                        domConstruct.destroy(query(".esriDataContainer")[0]);
                    }
                    //create panel which will allow user to add/update stats panel configuration
                    currentNodeIndex = domAttr.get(evt.currentTarget, "nodeIndex");
                    this._createVariablePanel(currentNodeIndex);

                }));
            }));
        },

        //function to create variable panel to add/update stats panel configuration
        _createVariablePanel: function (currentNodeIndex) {
            var parentAttributeName, populateSubVariables = false, variableContainer, variableContent, closebtnContainer, labelContainer,
            selectLabel, variableName, inputContainer, slectInputContainer, selectInput, variableInputContainer, variableInput, parentVariableOption,
            soureLinkContainer, sourceLinkLabel, soureLinkInputContainer, sourceLinkInputContent, sourceLinkInput, subVariableContainer,
            subVariableLabel, subVariableInputContainer, subVariableContentContainer, buttonContainer, buttonSaveButton,
            subVariablePanelAnchor, leftButtonContainer, rightButtonContainer, deleteButtonDiv, buttonState, buttonClass, buttonVisibilty,
            nextButtonDiv, previousButtonDiv;

            variableContainer = domConstruct.create("div", { "class": "esriDataContainer" }, query(".content-pane-center")[0], "last");
            variableContent = domConstruct.create("div", { "class": "esriVariableContentContainer" }, variableContainer);
            closebtnContainer = domConstruct.create("div", { "class": "esriVarPanelCloseButton icon-cancel-1", title: "Cancel" }, variableContent);
            on(closebtnContainer, "click", function () {
                domConstruct.destroy(variableContainer);
            });

            labelContainer = domConstruct.create("div", { "class": "esriVariableContainer" }, variableContent);
            selectLabel = domConstruct.create("div", { "class": "esriVariableContent", innerHTML: nls.widgets.TemplateBuilder.selectVariableText }, labelContainer);
            variableName = domConstruct.create("div", { "class": "esriVariableContent", innerHTML: nls.widgets.TemplateBuilder.label }, labelContainer);

            inputContainer = domConstruct.create("div", { "class": "esriVariableContainer" }, variableContent);
            slectInputContainer = domConstruct.create("div", { "class": "esriVariableContent" }, inputContainer);
            selectInput = domConstruct.create("select", { "class": "esriVariableSelect" }, slectInputContainer);
            parentVariableOption = domConstruct.create("option");
            parentVariableOption.value = nls.widgets.TemplateBuilder.selectVariableDropdown;
            parentVariableOption.text = nls.widgets.TemplateBuilder.selectVariableDropdown;
            selectInput.appendChild(parentVariableOption);
            on(selectInput, "change", lang.hitch(this, function (evt) {
                array.forEach(this.aoiLayer.fields, lang.hitch(this, function (currentField) {
                    if (currentField.name == evt.currentTarget.value) {
                        query(".esriVariableSelectInput")[0].value = currentField.alias;
                    }
                }));
                if (evt.currentTarget.value == "Select A Variable") {
                    domConstruct.empty(subVariableContentContainer);
                    query(".esriVariableSelectInput")[0].value = nls.widgets.TemplateBuilder.enterLabelText;
                    domClass.replace(buttonSaveButton, "esriButtonDisabled", "esriButtonEnabled" + currentNodeIndex);
                    if (domClass.contains(buttonSaveButton, "esriButtonDisabled")) {
                        domStyle.set(deleteButtonDiv, "display", "none");
                    }
                    else {
                        domStyle.set(deleteButtonDiv, "display", "block");
                    }
                    buttonSaveButton.disabled = true;
                    return;
                }
                else {
                    domClass.replace(buttonSaveButton, "esriButtonEnabled" + currentNodeIndex, "esriButtonDisabled");
                    if (domClass.contains(buttonSaveButton, "esriButtonDisabled")) {
                        domStyle.set(deleteButtonDiv, "display", "none");
                    }
                    else {
                        domStyle.set(deleteButtonDiv, "display", "block");
                    }
                    buttonSaveButton.disabled = false;
                }
                domConstruct.empty(subVariableContentContainer);
                this._populateSubVariables(subVariableContentContainer, currentNodeIndex, evt.currentTarget.value);
            }));

            //populate all fields of layer and append it to dropdown
            array.forEach(this.aoiLayer.fields, lang.hitch(this, function (currentField) {
                if ((currentField.type == "esriFieldTypeSmallInteger" || currentField.type == "esriFieldTypeInteger" || currentField.type == "esriFieldTypeSingle" || currentField.type == "esriFieldTypeDouble") && this.map.getLayer(this.config.summaryLayer.id).objectIdField !== currentField.name) {
                    parentVariableOption = domConstruct.create("option");
                    parentVariableOption.value = currentField.name;
                    parentVariableOption.text = currentField.alias + " (" + currentField.name + ")";
                    selectInput.appendChild(parentVariableOption);
                    if (this.config.summaryAttributes[currentNodeIndex].attribute == currentField.name) {
                        parentVariableOption.selected = "selected";
                        parentAttributeName = this.config.summaryAttributes[currentNodeIndex].label;
                        populateSubVariables = true;
                    }
                }
            }));
            variableInputContainer = domConstruct.create("div", { "class": "esriVariableContent" }, inputContainer);
            variableInput = domConstruct.create("input", { "class": "esriVariableSelectInput", value: parentAttributeName ? parentAttributeName : nls.widgets.TemplateBuilder.enterLabelText }, variableInputContainer);

            soureLinkContainer = domConstruct.create("div", { "class": "esriVariableContainer" }, variableContent);
            sourceLinkLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.sourceLinkText }, soureLinkContainer);

            soureLinkInputContainer = domConstruct.create("div", { "class": "esriVariableContainer" }, variableContent);
            sourceLinkInputContent = domConstruct.create("div", { "class": "esriSourceLink" }, soureLinkInputContainer);
            sourceLinkInput = domConstruct.create("input", { "class": "esriSourceLinkInput", value: this.config.summaryAttributes[currentNodeIndex].dataSourceUrl }, sourceLinkInputContent);

            subVariableContainer = domConstruct.create("div", { "class": "esriVariableContainer" }, variableContent);
            subVariableLabel = domConstruct.create("div", { innerHTML: nls.widgets.TemplateBuilder.selectSubVariableText }, subVariableContainer);

            subVariableInputContainer = domConstruct.create("div", { "class": "esriVariableContainer" }, variableContent);
            subVariableContentContainer = domConstruct.create("div", { "class": "esrisubVariableContent" }, subVariableInputContainer);
            if (populateSubVariables) {
                this._populateSubVariables(subVariableContentContainer, currentNodeIndex, this.config.summaryAttributes[currentNodeIndex].attribute);
            }

            buttonContainer = domConstruct.create("div", { "class": "esriSubVariableButtonContainer" }, variableContent);
            rightButtonContainer = domConstruct.create("div", { "style": "float:right" }, buttonContainer);
            leftButtonContainer = domConstruct.create("div", { "style": "float:left" }, buttonContainer);
            if (populateSubVariables) {
                buttonState = false;
                buttonClass = "esriButtonEnabled" + currentNodeIndex;
            }
            else {
                buttonState = true;
                buttonClass = "esriButtonDisabled";
            }

            if (buttonClass == "esriButtonDisabled") {
                buttonVisibilty = "none";
            }
            else {
                buttonVisibilty = "block";
            }
            nextButtonDiv = domConstruct.create("button", { "class": "esriButton esriNextPreviousButton", innerHTML: nls.widgets.TemplateBuilder.nextButtonText }, leftButtonContainer);
            previousButtonDiv = domConstruct.create("button", { "class": "esriButton esriNextPreviousButton", innerHTML: nls.widgets.TemplateBuilder.prevButtonText }, leftButtonContainer);
            deleteButtonDiv = domConstruct.create("div", { "class": "esriClearButton", innerHTML: nls.widgets.TemplateBuilder.clearData }, rightButtonContainer);
            domStyle.set(deleteButtonDiv, "display", buttonVisibilty);
            buttonSaveButton = domConstruct.create("button", { "style": "float:right", "class": "esriButton " + buttonClass, innerHTML: nls.widgets.TemplateBuilder.subVariablePanelButtonText, disabled: buttonState }, rightButtonContainer);
            if (Number(currentNodeIndex) === 3) {
                domStyle.set(nextButtonDiv, "display", "none");
            }
            if (Number(currentNodeIndex) === 0) {
                domStyle.set(previousButtonDiv, "display", "none");
            }
            on(buttonSaveButton, "click", lang.hitch(this, function () {
                var ex = this._saveStatsPanelState(currentNodeIndex);
                if (ex)
                    domConstruct.destroy(variableContainer);
            }));
            on(deleteButtonDiv, "click", lang.hitch(this, function () {
                this._resetStatsPanelState(currentNodeIndex);
                alert(nls.widgets.TemplateBuilder.alertMessage.resetVariableMessage);
                domConstruct.destroy(variableContainer);
                this.unSavedChanges = true;
                this._displayMessage();
            }));
            on(nextButtonDiv, "click", lang.hitch(this, function () {
                if (query(".esriVariableSelectInput")[0].value != nls.widgets.TemplateBuilder.enterLabelText) {
                    var statsSaved = this._saveStatsPanelState(currentNodeIndex);
                    if (!statsSaved) {
                        return;
                    }
                }
                if (query(".esriDataContainer").length) {
                    domConstruct.destroy(query(".esriDataContainer")[0]);
                }
                if (Number(currentNodeIndex) < 3) {
                    currentNodeIndex++;
                    this._createVariablePanel(currentNodeIndex.toString());
                }
                if (Number(currentNodeIndex) === 3) {
                    domStyle.set(nextButtonDiv, "display", "none");
                }
            }));
            on(previousButtonDiv, "click", lang.hitch(this, function () {
                if (query(".esriVariableSelectInput")[0].value != nls.widgets.TemplateBuilder.enterLabelText) {
                    var statsSaved = this._saveStatsPanelState(currentNodeIndex);
                    if (!statsSaved) {
                        return;
                    }
                }
                if (query(".esriDataContainer").length) {
                    domConstruct.destroy(query(".esriDataContainer")[0]);
                }
                if (Number(currentNodeIndex) >= 0) {
                    currentNodeIndex--;
                    this._createVariablePanel(currentNodeIndex.toString());
                }
                if (Number(currentNodeIndex) === 0) {
                    domStyle.set(previousButtonDiv, "display", "none");
                }
            }));

            subVariablePanelAnchor = domConstruct.create("div", { "class": "esriDownArrow" }, variableContainer);
            this._setAnchorPosition(currentNodeIndex);
        },

        //function to populate sub variables and allow users to add/update the same
        _populateSubVariables: function (subVariableContentContainer, currentNodeIndex, parentAttributeName) {
            var count = 0, currentFieldAlias;
            array.forEach(this.aoiLayer.fields, lang.hitch(this, function (currentField) {
                var subVariableContentDiv, subVariableContentFirstDiv, checkBox, subVariableContentSecondDiv, label,
                subVariableContentThirdDiv, inputText, checkBoxStatusClass, className;
                checkBoxStatusClass = "esriUncheckIcon";
                currentFieldAlias = "";
                if (parentAttributeName != currentField.name && (currentField.type == "esriFieldTypeSmallInteger" || currentField.type == "esriFieldTypeInteger" || currentField.type == "esriFieldTypeSingle" || currentField.type == "esriFieldTypeDouble") && this.map.getLayer(this.config.summaryLayer.id).objectIdField !== currentField.name) {
                    for (var i = 0; i < this.config.summaryAttributes[currentNodeIndex].children.length; i++) {
                        if (currentField.name == this.config.summaryAttributes[currentNodeIndex].children[i].attribute) {
                            checkBoxStatusClass = "esriCheckIcon";
                            currentFieldAlias = this.config.summaryAttributes[currentNodeIndex].children[i].label;
                            break;
                        }
                    }
                    if (count % 2 !== 0)
                        className = "esriRowEvenColor";
                    else
                        className = "";
                    subVariableContentDiv = domConstruct.create("div", { "class": "esriSubVariableContainer" }, subVariableContentContainer);
                    subVariableContentFirstDiv = domConstruct.create("div", { "class": " esriSubVariable esriFirstColumn " + className }, subVariableContentDiv);
                    checkBox = domConstruct.create("div", { "class": "esriCheckBoxIcon" + " " + checkBoxStatusClass }, subVariableContentFirstDiv);
                    domAttr.set(checkBox, "index", count);
                    subVariableContentSecondDiv = domConstruct.create("div", { "class": " esriSubVariable esriSecondColumn " + className }, subVariableContentDiv);
                    label = domConstruct.create("label", { "class": "esriVariableLabel", innerHTML: currentField.name }, subVariableContentSecondDiv);
                    domAttr.set(label, "index", count);
                    subVariableContentThirdDiv = domConstruct.create("div", { "class": " esriSubVariable esriThirdColumn " + className }, subVariableContentDiv);
                    inputText = domConstruct.create("input", { "class": "esriVariableInput" }, subVariableContentThirdDiv);
                    domAttr.set(inputText, "index", count);
                    inputText.value = currentFieldAlias ? currentFieldAlias : currentField.alias;
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
                            alert(nls.widgets.TemplateBuilder.alertMessage.maxVariableSelection);
                        }
                    });
                }
            }));
        },

        //funtion to save stats panel configuration
        _saveStatsPanelState: function (currentNodeIndex) {
            var subVariables, columnIndex, parentAttribute, variableSourceLink, parentAttributeLabel, subVariableAttribute, subVariableLabel,
            summaryAttributes = [], validationRequire = false;
            subVariables = query(".esriCheckBoxIcon.esriCheckIcon");
            parentAttribute = query(".esriVariableSelect")[0].value;
            parentAttributeLabel = lang.trim(query(".esriVariableSelectInput")[0].value);
            variableSourceLink = query(".esriSourceLinkInput")[0].value;
            if (parentAttributeLabel === "") {
                alert(nls.widgets.TemplateBuilder.alertMessage.variableLabelValidation);
                return false;
            }

            //loop selected sub variables and save them
            array.forEach(subVariables, lang.hitch(this, function (currentCheckdField) {
                columnIndex = domAttr.get(currentCheckdField, "index");
                subVariableAttribute = query(".esriVariableInput")[columnIndex].value;
                if (subVariableAttribute === "") {
                    validationRequire = true;
                }
                subVariableLabel = query(".esriVariableLabel")[columnIndex].innerHTML;
                summaryAttributes.push({ "attribute": subVariableLabel, "label": subVariableAttribute });
            }));
            if (validationRequire) {
                alert(nls.widgets.TemplateBuilder.alertMessage.subVariableLabelValidation);
                return false;
            }

            this.config.summaryAttributes[currentNodeIndex].attribute = parentAttribute;
            this.config.summaryAttributes[currentNodeIndex].label = parentAttributeLabel ? parentAttributeLabel : "No Label";
            this.config.summaryAttributes[currentNodeIndex].dataSourceUrl = variableSourceLink;

            this.unSavedChanges = true;
            this._displayMessage();
            this.config.summaryAttributes[currentNodeIndex].children = [];
            this.config.summaryAttributes[currentNodeIndex].children = summaryAttributes;
            return true;
        },

        _resetStatsPanelState: function (currentNodeIndex) {
            this.config.summaryAttributes[currentNodeIndex].attribute = "";
            this.config.summaryAttributes[currentNodeIndex].label = "Add Variable";
            this.config.summaryAttributes[currentNodeIndex].dataSourceUrl = "";
            this.config.summaryAttributes[currentNodeIndex].children = [];
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
            this.get("drawer").resize();
        },

        //function to update item on AGOL with changed configuration settings
        _updateItem: function (isRollBackRequired, newURL) {
            var applicationSettings;
            //Here we are using the response,so we dont need to create whole item again.
            //we are just modifying required parameters.
            if (isRollBackRequired) {
                this.config = this.previousConfigObj;
                applicationSettings = this._configureAppSettings(this.previousConfigObj);
            } else {
                this.config = this.config;
                applicationSettings = this._configureAppSettings(this.config);
            }
            delete this.config.i18n;
            if (this.config.edit) {
                delete this.config.edit;
            }
            this.response.itemData.values = applicationSettings;
            this.response.item.tags = typeof (this.response.item.tags) == "object" ? this.response.item.tags.join(',') : this.response.item.tags;
            this.response.item.typeKeywords = typeof (this.response.item.typeKeywords) == "object" ? this.response.item.typeKeywords.join(',') : this.response.item.typeKeywords;
            var rqData = lang.mixin(this.response.item, {
                id: this.config.appid,
                item: this.config.appid,
                itemType: "text",
                f: 'json',
                token: this.userInfo.token,
                title: this.config.title,
                text: JSON.stringify(this.response.itemData),
                type: "Web Mapping Application",
                overwrite: true
            });

            arcgisUtils.getItem(this.config.appid).then(lang.hitch(this, function (response) {
                var updateURL = this.userInfo.portal.url + "/sharing/content/users/" + this.userInfo.username + (response.item.ownerFolder ? ("/" + response.item.ownerFolder) : "") + "/items/" + this.config.appid + "/update";
                esriRequest({
                    url: updateURL,
                    content: rqData,
                    handleAs: 'json'
                }, { usePost: true }).then(lang.hitch(this, function (result) {
                    if (result.success) {
                        if (newURL) {
                            window.location.href = newURL;
                        }
                        else if (!isRollBackRequired) {
                            location.reload();
                        }
                        else {
                        }
                    }
                }), function () {
                    alert(nls.widgets.TemplateBuilder.alertMessage.failMessage);
                });
            }));
        },

        _configureAppSettings: function (config) {
            var appSettings = {
                "defaultBasemap": config.defaultBasemap,
                "defaultPanel": config.defaultPanel,
                "enableAboutPanel": config.enableAboutPanel,
                "enableBasemapToggle": config.enableBasemapToggle,
                "enableEntireAreaButton": config.enableEntireAreaButton,
                "enableHomeButton": config.enableHomeButton,
                "enableLayersPanel": config.enableLayersPanel,
                "enableLegendPanel": config.enableLegendPanel,
                "enableLocateButton": config.enableLocateButton,
                "enableModifiedDate": config.enableModifiedDate,
                "enableMoreInfo": config.enableMoreInfo,
                "enableShareDialog": config.enableShareDialog,
                "enablePopupDialog": config.enablePopupDialog,
                "enableSummary": config.enableSummary,
                "enableTitle": config.enableTitle,
                "featureCurrentTransparency": config.featureCurrentTransparency,
                "featuresTransparency": config.featuresTransparency,
                "nextBasemap": config.nextBasemap,
                "selectEntireAreaOnStart": config.selectEntireAreaOnStart,
                "summary": config.summary,
                "summaryAttributeOrder": config.summaryAttributeOrder,
                "summaryAttributes": config.summaryAttributes,
                "summaryLayer": config.summaryLayer,
                "theme": config.theme,
                "title": config.title,
                "webmap": config.webmap,
                "zoomType": config.zoomType,
                "enableRendererArea": config.enableRendererArea
            };
            return appSettings;
        },
        _createTooltip: function () {
            var myTooltipDialog, isShowing = false;
            myTooltipDialog = new TooltipDialog({
                id: 'tooltipDialog',
                style: "max-width: 300px; font-size: 12px;",
                onMouseLeave: function () {
                    popup.close(myTooltipDialog);
                },
                onShow: function () {
                    isShowing = true;
                    myTooltipDialog.focus();
                    myTooltipDialog.set("focused", true);
                },
                onHide: function () {
                    isShowing = false;
                },
                onBlur: function () {
                    if (isShowing) {
                        popup.close(myTooltipDialog);
                    }
                }
            });
            this._attachMouseEvents(myTooltipDialog);
        },

        _attachMouseEvents: function (myTooltipDialog) {
            var _this = this;
            //tooltip for Share dialog
            on(dom.byId('ShareDialog'), "mouseover", function () {
                var shareDialogContent, sharelabel, shareOnOfButton, currentState, parameterStatus;
                shareDialogContent = domConstruct.create("div", { "class": "esriTooltipDialog" }, null);
                currentState = _this._checkButtonState(_this.config.enableShareDialog);
                sharelabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriFloatLeftStyle esriToggleButtonClass" }, shareDialogContent);
                shareOnOfButton = domConstruct.create("div", { "class": "esriFloatLeftStyle " + currentState.class }, shareDialogContent);
                on(shareOnOfButton, "click", function () {
                    parameterStatus = _this._toggleButtonState(shareOnOfButton, _this.config.enableShareDialog, sharelabel);
                    _this.config.enableShareDialog = parameterStatus;
                    _this._disableComponent(parameterStatus, query(".icon-share")[0]);
                });
                _this._displayTooltip(myTooltipDialog, shareDialogContent, this, false);
            });
            //tooltip for basemap
            on(dom.byId('BasemapToggle'), "mouseover", function () {
                var basemapContent, basemapLabel, basemapOnOfButton, basmeapPencilIcon, currentState, parameterStatus;
                basemapContent = domConstruct.create("div", { "class": "esriTooltipDialog" }, null);
                currentState = _this._checkButtonState(_this.config.enableBasemapToggle);
                basemapLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriFloatLeftStyle esriToggleButtonClass" }, basemapContent);
                basemapOnOfButton = domConstruct.create("div", { "class": "esriFloatLeftStyle " + currentState.class }, basemapContent);
                basmeapPencilIcon = domConstruct.create("div", { "class": "esriEditBasemapIcon esriFloatLeftStyle" }, basemapContent);
                on(basemapOnOfButton, "click", function () {
                    parameterStatus = _this._toggleButtonState(basemapOnOfButton, _this.config.enableBasemapToggle, basemapLabel);
                    _this.config.enableBasemapToggle = parameterStatus;
                    _this._disableComponent(parameterStatus, query(".BasemapToggle")[0]);
                });
                on(basmeapPencilIcon, "click", function () {
                    _this._createAppSettingsPanel();
                });
                _this._displayTooltip(myTooltipDialog, basemapContent, this, false);
            });
            if (dom.byId('renderer_menu')) {
                on(dom.byId('renderer_menu'), "mouseover", function () {
                    var rendererContent, rendererLabel, rendererOnOfButton, rendererSort, currentClass, currentState, rendererSortLabel,
                    parameterStatus;
                    rendererContent = domConstruct.create("div", { "class": "esriTooltipDialog" }, null);
                    currentState = _this._checkButtonState(_this.config.enableRendererArea);
                    rendererLabel = domConstruct.create("div", { innerHTML: currentState.label, "class": "esriFloatLeftStyle esriToggleButtonClass" }, rendererContent);
                    rendererOnOfButton = domConstruct.create("div", { "class": "esriFloatLeftStyle " + currentState.class }, rendererContent);
                    currentClass = _this.config.summaryAttributeOrder == "ASC" ? "esriSelectIcon" : "esriDeselectIcon";
                    rendererSortLabel = domConstruct.create("label", { innerHTML: nls.widgets.TemplateBuilder.summaryAttrAscendingOrderTooltip, "class": "esriFloatLeftStyle" }, rendererContent);
                    rendererSort = domConstruct.create("div", { "class": "esriFloatLeftStyle " + currentClass, "style": "margin-left:5px;" }, rendererContent);
                    on(rendererOnOfButton, "click", function () {
                        parameterStatus = _this._toggleButtonState(rendererOnOfButton, _this.config.enableRendererArea, rendererLabel);
                        _this.config.enableRendererArea = parameterStatus;
                        if (parameterStatus === false) {
                            if (domClass.contains(_this.areaOnOffButton, "esriOnButton")) {
                                domClass.replace(_this.areaOnOffButton, "esriOffButton", "esriOnButton");
                                domAttr.set(_this.areaOnOffButtonLabel, "innerHTML", nls.widgets.TemplateBuilder.offButtonLabel);
                                _this.config.enableEntireAreaButton = false;
                            }
                        } else {
                            if (_this.entireAreaPrevState) {
                                domClass.replace(_this.areaOnOffButton, "esriOnButton", "esriOffButton");
                                domAttr.set(_this.areaOnOffButtonLabel, "innerHTML", nls.widgets.TemplateBuilder.onButtonLabel);
                                _this.config.enableEntireAreaButton = true;
                            }
                        }
                    });
                    on(rendererSort, "click", function () {
                        parameterStatus = _this._toggleCheckBoxSate(rendererSort, _this.config.summaryAttributeOrder, rendererOnOfButton);
                        var order = parameterStatus ? "ASC" : "DESC";
                        _this.config.summaryAttributeOrder = order;
                    });
                    _this._displayTooltip(myTooltipDialog, rendererContent, this, true);
                });
            }
        },

        //function to show tooltip on hover
        _displayTooltip: function (myTooltipDialog, content, parentNode, rendererMenu) {
            myTooltipDialog.setContent(content);
            var orientation = rendererMenu ? ["below-centered", "above-centered"] : ["below-centered"];
            popup.open({
                popup: myTooltipDialog,
                around: parentNode,
                orient: orientation
            });
        },

        //function to disable the configurable component
        _disableComponent: function (parameterStatus, domNode) {
            if (parameterStatus) {
                domStyle.set(domNode, "opacity", "1.0");
                domStyle.set(domNode, "border", "none");
            }
            else {
                domStyle.set(domNode, "opacity", "0.3");
            }
        },

        _formatNumber: function (n, decPlaces) {
            var isNumberNegative = false, isNumberFormatted = false;
            if (n < 0) {
                isNumberNegative = true;
                n = Math.abs(n);
            }
            // format large numbers
            decPlaces = Math.pow(10, decPlaces);
            // thousand, million, billion, trillion.
            var abbrev = ["k", "m", "b", "t"];
            for (var i = abbrev.length - 1; i >= 0; i--) {
                var size = Math.pow(10, (i + 1) * 3);
                if (size <= n) {
                    if (isNumberNegative) {
                        n = -n;
                    }
                    n = Math.round(n * decPlaces / size) / decPlaces;
                    if ((n === 1000) && (i < abbrev.length - 1)) {
                        n = 1;
                        i++;
                    }
                    n += abbrev[i];
                    isNumberFormatted = true;
                    break;
                }
            }
            if (!isNumberFormatted && !isNaN(n)) {
                if (isNumberNegative) {
                    n = -n;
                }
                var numLength = n.toString().length;
                if (numLength > 5)
                    n = n.toPrecision(5);
            }
            return n;
        },

        _decPlaces: function (n) {
            // number not defined
            if (!n) {
                if (n === 0) {
                    n = 0;
                }
            }
            // format number according to length
            var decPlaces;
            var nStr = n.toString();
            if (nStr.length >= 7) {
                decPlaces = 1;
            } else if (nStr.length >= 5) {
                decPlaces = 0;
            } else if (nStr.length === 4) {
                return number.format(n);
            } else {
                decPlaces = 2;
            }
            return this._formatNumber(n, decPlaces);
        }
    });
    return Widget;
});
