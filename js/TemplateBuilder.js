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
    "dojo/topic"
],
function (
    Evented,
    declare,
    lang,
    _WidgetBase,
    ContentPane,
    dom, on, string, query, array, domConstruct, domClass, Dialog, TextBox, esriRequest, arcgisUtils, SimpleTextarea, CheckBox, domAttr, domGeom, domStyle, portal, nls, topic
) {
    var Widget = declare([_WidgetBase, Evented], {
        declaredClass: "application.TemplateBuilder",
        //URL for updating Item
        updateItemURL: "https://www.arcgis.com/sharing/content/users/${username}/items/${appid}/update",
        //Predefined keywords for basemap's available on AGOL
        availableBaseMaps: ["streets", "satellite", "hybrid", "topo", "gray", "oceans", "national-geographic", "osm"],
        unSavedChanges: false,
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
            var applicationSettingButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.applicationSettingText, "class": "esriButton" }, buttonContainer);
            var saveButtonContainer = domConstruct.create("div", { class: "esriSaveButtonContainer" }, builderNode);
            var applicationSettingSaveButton = domConstruct.create("button", { innerHTML: "Save", "class": "esriButton esriSaveButton" }, saveButtonContainer);
            var unsavedChangesText = domConstruct.create("div", { "class": "esriUnsavedChanges", innerHTML: "Unsaved Changes" }, saveButtonContainer);
            on(applicationSettingSaveButton, "click", lang.hitch(this, function () {
                domAttr.set(unsavedChangesText, "innerHTML", "Saving Changes...");
                this._updateItem();
            }));
            on(applicationSettingButton, "click", lang.hitch(this, function () {
                this._createConfigurationPanel(true);
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
            this._showEditableUI();
            this._createPortal();
        },
        _createPortal: function () {
            // create portal
            var _self = this, portalURL;
            portalURL = this._getPortalURL();
            this._portal = new portal.Portal(this._getPortalURL());
            // portal loaded
            this.own(on(this._portal, "Load", lang.hitch(this, function () {
                this._portal.signIn().then(function (loggedInUser) {
                    _self.currentUserName = loggedInUser.username;
                    if (!_self.config.summaryLayerTitle || _self.config.summaryLayerId == "") {
                        _self._createConfigurationPanel(true);
                    }
                }, function (err) {
                    alert("Sign-in Failed");
                });
            })));
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this.inherited(arguments);
        },

        //This functional internally calls other functions which will create Editable components
        _showEditableUI: function () {

            this._createEditableTitle();
            this._createCheckBoxPanel();
            this._createEditableBasemapWidget();
            this._createEditableAreaDescription();
            this._editRendererMenu();
            this._editStatsPanel();
            //Create edit icons , everytime the stats-panels are re-created
            topic.subscribe("createEditIcons", (lang.hitch(this, function () {
                if (query(".esriStatspanelEditIcon")) {
                    array.forEach(query(".esriStatspanelEditIcon"), function (icon) {
                        domConstruct.destroy(icon);
                    });
                }
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
                isShareDialog ? this.config.ShowShareDialog = false : this.config.showAboutDialog = false;

            } else {
                domClass.replace(checkIcon, "esriCheckIcon", "esriUncheckIcon");
                isShareDialog ? this.config.ShowShareDialog = true : this.config.showAboutDialog = true;
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
                this._updateItem();
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
            for (var i = 0; i < this.map.getLayersVisibleAtScale().length; i++) {
                //allow only feature layer to be added to dropdown
                if ((this.map.getLayersVisibleAtScale()[i].declaredClass == "esri.layers.FeatureLayer")) {
                    var option = domConstruct.create("option");
                    option.value = this.map.getLayersVisibleAtScale()[i].id;
                    option.text = this.map.getLayersVisibleAtScale()[i].name;
                    layerSelect.appendChild(option);
                }
                if (this.config.summaryLayerId == this.map.getLayersVisibleAtScale()[i].id) {
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
                this.config.summaryLayerId = layerSelect.value;
            }
            on(layerSelect, "change", lang.hitch(this, function (value) {
                this.config.summaryLayerId = value.currentTarget.value;
            }));
            configurationPanelButtonContainer = domConstruct.create("div", { "class": "esriButtonConfig" }, fieldsetContainer);
            innerButtonContainer = domConstruct.create("div", { "class": "esriButtonInnerConfig" }, configurationPanelButtonContainer);
            configureSaveVariableButton = domConstruct.create("button", { innerHTML: nls.widgets.TemplateBuilder.saveButtonText, "class": "esriButton esriButtonColorEnable" }, innerButtonContainer);
            on(configureSaveVariableButton, "click", lang.hitch(this, function () {
                this._updateItem();
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
            var editTitleIcon = domConstruct.create("div", { "class": "esriEditTitleIcon" }, dom.byId("titleContainer"));
            dojo.connect(editTitleIcon, "onclick", lang.hitch(this, function () {
                domConstruct.empty(appTitle);
                var titleInputBox = domConstruct.create("input", { value: appTitle.title, "class": "esriEditTitleInput" }, appTitle);
                titleInputBox.select();
                on(titleInputBox, "blur", lang.hitch(this, function () {
                    domConstruct.empty(appTitle);
                    appTitle.innerHTML = titleInputBox.value;
                    appTitle.title = appTitle.innerHTML;
                    this.config.title = appTitle.title;
                    domConstruct.place(editTitleIcon, dom.byId("titleContainer"));
                    this.unSavedChanges = true;
                    this._displayMessage();
                }));
            }));
        },

        //function to create checkbox panel to show/hide about or share dialog container
        _createCheckBoxPanel: function () {
            var rightMenu, toolbarEditIcon, checkboxesContainer, shareContainer, shareCheckIcon, dialogStatus,
            aboutCheckIcon, aboutContainer;
            rightMenu = query(".top-menu-right")[0];
            toolbarEditIcon = domConstruct.create("div", { "class": "esriToolbarEditIcon" }, rightMenu, "first");
            //Checkboxes to show/hide share and about icons in the header panel
            checkboxesContainer = domConstruct.create("div", { "class": "esriCheckboxesContainer" }, dom.byId("cp_outer_center"));
            shareContainer = domConstruct.create("div", { "class": "esriShareContainer" }, checkboxesContainer);
            this.config.ShowShareDialog ? dialogStatus = "esriCheckIcon" : dialogStatus = "esriUncheckIcon";
            shareCheckIcon = domConstruct.create("div", { "class": dialogStatus }, shareContainer);
            domConstruct.create("div", { "class": "esriCheckLabel", "innerHTML": nls.widgets.TemplateBuilder.showShareDialogText }, shareContainer);
            on(shareCheckIcon, "click", lang.hitch(this, function () {
                this._toggleDialog(shareCheckIcon, "ShareDialog", true);
            }));

            aboutContainer = domConstruct.create("div", { "class": "esriAboutContainer" }, checkboxesContainer);
            this.config.showAboutDialog ? dialogStatus = "esriCheckIcon" : dialogStatus = "esriUncheckIcon";
            aboutCheckIcon = domConstruct.create("div", { "class": dialogStatus }, aboutContainer);
            domConstruct.create("div", { "class": "esriCheckLabel", "innerHTML": nls.widgets.TemplateBuilder.showAboutDialogText }, aboutContainer);
            on(aboutCheckIcon, "click", lang.hitch(this, function () {
                this._toggleDialog(aboutCheckIcon, "AboutDialog", false);
            }));

            on(toolbarEditIcon, "click", lang.hitch(this, function () { this._toggleContainer(checkboxesContainer); }));
        },

        //fucntion to edit basemap toggle widget
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
            var areaDescription, editAreaDescriptionIcon;
            if (dom.byId("areaDescription")) {
                areaDescription = dom.byId("areaDescription");
                editAreaDescriptionIcon = domConstruct.create("div", { "class": "editAreaDescriptionIcon" }, null);
                domConstruct.place(editAreaDescriptionIcon, areaDescription, "first");
                dojo.connect(editAreaDescriptionIcon, "onclick", lang.hitch(this, function () {
                    var innerText = areaDescription.innerText;
                    domConstruct.empty(areaDescription);
                    var descriptionTextArea = domConstruct.create("textarea", {}, areaDescription);
                    var editableTextArea = new SimpleTextarea({
                        value: innerText,
                        class: "esriSimpleTextArea"
                    }, descriptionTextArea);
                    on(editableTextArea, "blur, touchend", lang.hitch(this, function (evt) {
                        var innerText = editableTextArea.textbox.value;
                        domConstruct.empty(areaDescription);
                        dom.byId("areaDescription").innerHTML = innerText;
                        this.config.areaDescription = innerText;
                        domConstruct.place(editAreaDescriptionIcon, areaDescription, "first");
                        this.unSavedChanges = true;
                        this._displayMessage();
                    }));
                }));
            }
        },

        //edit impact area renderers
        _editRendererMenu: function () {
            var rendererMenu, editDataLayerIconContainer;
            if (dom.byId("renderer_menu")) {
                rendererMenu = dom.byId("renderer_menu");
                editDataLayerIconContainer = domConstruct.create("div", { "class": "esriIconContainer" }, null);
                domConstruct.place(editDataLayerIconContainer, rendererMenu, "before");
                this.config.showEntireAreaButton ? title = nls.widgets.TemplateBuilder.hideEntireAreaTootltip : title = nls.widgets.TemplateBuilder.showEntireAreaTooltip;
                var showEntireAreaPanel = domConstruct.create("div", { "class": "esriEditLayerIcon", title: title }, editDataLayerIconContainer);
                on(showEntireAreaPanel, "click", lang.hitch(this, function () {
                    if (domStyle.get(query(".summarize")[0], "display") == "list-item") {
                        domStyle.set(query(".summarize")[0], "display", "none");
                        this.config.showEntireAreaButton = false;
                        showEntireAreaPanel.title = nls.widgets.TemplateBuilder.showEntireAreaTooltip;
                    }
                    else {
                        domStyle.set(query(".summarize")[0], "display", "list-item");
                        this.config.showEntireAreaButton = true;
                        showEntireAreaPanel.title = nls.widgets.TemplateBuilder.hideEntireAreaTootltip;
                    }
                    this.unSavedChanges = true;
                    this._displayMessage();
                }));
                this.config.summaryAttributeOrder == "DESC" ? className = "esriSortNameDown" : className = "esriSortNameUp";
                if (className == "esriSortNameDown") {
                    title = nls.widgets.TemplateBuilder.summaryAttrAscendingOrderTooltip;
                }
                else {
                    title = nls.widgets.TemplateBuilder.summaryAttrDescendingOrderTooltip;
                }
                var attributeOrder = domConstruct.create("div", { "class": className, title: title }, editDataLayerIconContainer);
                on(attributeOrder, "click", lang.hitch(this, function () {
                    this._sortRenderer(attributeOrder);
                    this.unSavedChanges = true;
                    this._displayMessage();
                }));
            }
        },

        //function to  edit stats panel blocks
        _editStatsPanel: function () {
            var editpanelButton, statsPanel;
            on(query(".panel-parent"), "click", lang.hitch(this, function (evt) {
                this._toggleStatsPanelEditIcon();
            }));

            on(query(".div-header-close"), "click", lang.hitch(this, function () {
                this._toggleStatsPanelEditIcon();
            }));
            statsPanel = query(".panel .count");
            array.forEach(statsPanel, lang.hitch(this, function (panel, index) {
                editpanelButton = domConstruct.create("div", { "class": "esriStatspanelEditIcon" }, panel, "before");
                domAttr.set(editpanelButton, "nodeIndex", index);
                this.own(on(editpanelButton, "click", lang.hitch(this, function (evt) {
                    evt.stopPropagation();
                    if (query(".esriDataContainer").length) {
                        domConstruct.destroy(query(".esriDataContainer")[0]);
                    }
                    //create panel which will allow user to add/update stats panel configuration
                    this._createVariablePanel(evt.currentTarget);
                })));
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
                array.forEach(this.map.getLayer(this.config.summaryLayerId).fields, lang.hitch(this, function (currentField) {
                    if (currentField.name == evt.currentTarget.value) {
                        query(".esriVariableSelectInput")[0].value = currentField.alias;
                    }
                }));
                if (evt.currentTarget.value == "Select Variable") {
                    domConstruct.empty(subVariableContentContainer);
                    query(".esriVariableSelectInput")[0].value = "Enter Label";
                    domClass.replace(buttonSaveButton, "esriButtonDisabled", "esriButtonEnabled" + currentNodeIndex);
                    domClass.replace(delteButtonDiv, "esriButtonDisabled", "esriButtonEnabled" + currentNodeIndex);
                    buttonSaveButton.disabled = true;
                    delteButtonDiv.disabled = true;
                    return;
                }
                else {
                    domClass.replace(buttonSaveButton, "esriButtonEnabled" + currentNodeIndex, "esriButtonDisabled");
                    domClass.replace(delteButtonDiv, "esriButtonEnabled" + currentNodeIndex, "esriButtonDisabled");
                    buttonSaveButton.disabled = false;
                    delteButtonDiv.disabled = false;
                }
                domConstruct.empty(subVariableContentContainer);
                this._populateSubVariables(subVariableContentContainer, currentNodeIndex, evt.currentTarget.value);
            }));

            //populate all fields of layer and append it to dropdown
            array.forEach(this.map.getLayer(this.config.summaryLayerId).fields, lang.hitch(this, function (currentField) {
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
            delteButtonDiv = domConstruct.create("button", { "style": "margin-top:2px;", class: "esriButton " + buttonClass, innerHTML: "Clear Data", disabled: buttonState }, buttonContainer);
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
            array.forEach(this.map.getLayer(this.config.summaryLayerId).fields, lang.hitch(this, function (currentField, index) {
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

        //function to sort impact area renderers
        _sortRenderer: function (attributeOrder, isSorting) {
            var birdList = query(".menu-list")[0].getElementsByTagName("li");
            var i = birdList.length;
            while (i--) {
                if (!domClass.contains(birdList[i], "summarize")) {
                    query(".menu-list")[0].appendChild(birdList[i]);
                }
            }
            if (domClass.contains(attributeOrder, "esriSortNameDown")) {
                this.config.summaryAttributeOrder = "ASC";
                domClass.replace(attributeOrder, "esriSortNameUp", "esriSortNameDown");
                attributeOrder.title = nls.widgets.TemplateBuilder.summaryAttrAscendingOrderTooltip;
            }
            else {
                this.config.summaryAttributeOrder = "DESC";
                domClass.replace(attributeOrder, "esriSortNameDown", "esriSortNameUp");
                attributeOrder.title = nls.widgets.TemplateBuilder.summaryAttrDescendingOrderTooltip;
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
        _updateItem: function () {
            //Here we are using the response,so we dont need to create whole item again.
            //we are just modifying required parameters.
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
                    location.reload();
                }
            }), function (err) {
                alert("Failed");
            });
        },

        _getPortalURL: function () {
            return arcgisUtils.arcgisUrl.split('/sharing/')[0];
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
