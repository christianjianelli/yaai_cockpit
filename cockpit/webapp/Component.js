sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/Messaging",
    "sap/base/i18n/Localization",
    "sap/ui/core/routing/History",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "aaic/cockpit/model/models"
], (UIComponent, Messaging, Localization, History, Dialog, Button, Text, models) => {
    "use strict";

    return UIComponent.extend("aaic.cockpit.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        _sideNavigation: null,

        _sidePanelControl: null,

        _isDirty: false,

        _skipDataLossCheck: false,

        _onHoldNavigation: {
            route: "",
            params: {}
        },

        init() {

            var that = this;

            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            Localization.setLanguage("en")

            //sap.ui.getCore().applyTheme("sap_horizon_dark");

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // set message model
            this.setModel(Messaging.getMessageModel(), "message");

            // set the navigation model
            this.setModel(models.createNavigationModel(), "navigation");

            // set the settings model
            this.setModel(models.createSettingsModel(), "settings");

            // set the userinfo model
            this.setModel(models.createJSONModel("OneWay"), "userinfo");
            
            // set the stats model
            this.setModel(models.createJSONModel("OneWay"), "stats");

            // set the apis model
            this.setModel(models.createJSONModelExt(), "apis");

            // set the tools model
            this.setModel(models.createJSONModelExt(), "tools");

            // set the RAG model
            this.setModel(models.createJSONModelExt(), "rag");

            // set the Agents model
            this.setModel(models.createJSONModelExt(), "agents");

            // set the Models (Value Help) model
            this.setModel(models.createJSONModel("OneWay"), "modelsvh");

            // set the Logs model
            this.setModel(models.createJSONModel("OneWay"), "logs");

            // set the AsyncTasks model
            this.setModel(models.createJSONModel("OneWay"), "async");

            // set the Chats model
            this.setModel(models.createJSONModel("OneWay"), "chats");

            // set the Chat model
            this.setModel(models.createJSONModel("OneWay"), "chat");

            // enable routing
            const router = this.getRouter();

            router.initialize();

            // Handle browser back/forward or tab closing
            window.onbeforeunload = function (e) {

                that._checkUnsavedChanges();

                if (that._isDirty) {

                    const resourceBundle = this.getModel("i18n").getResourceBundle();

                    var message = resourceBundle.getText("discardChangesQuestion");
                
                    //e.returnValue = message; // Standard for most browsers
                    
                    return message; // For some older browsers
                }

            };

            window.addEventListener("popstate", function () { 

                that._checkUnsavedChanges();

                if (that._isDirty) {

                    that.preventDataLoss();

                }
                
            });

        },

        setSidePanel: function(control) {

            this._sidePanelControl = control;

        },

        getSidePanel: function() {

            return this._sidePanelControl;

        },

        setSideNavigation: function(control) {

            this._sideNavigation = control;

        },

        getSideNavigation: function() {

            return this._sideNavigation;

        },

        setDirty: function(isDirty) {

            this._isDirty = isDirty;

        },

        isDirty: function() {

            this._checkUnsavedChanges();

            return this._isDirty;

        },

        skipDataLossCheck: function() {
            this._skipDataLossCheck = true;
        },

        preventDataLoss: function() {

            if (this._skipDataLossCheck === true) {
                this._skipDataLossCheck = false;
                return;
            }
            
            const that = this;

            const resourceBundle = this.getModel("i18n").getResourceBundle();

            const router = this.getRouter();

            this._checkUnsavedChanges();

            if (this._isDirty) {

                router.stop();

                if (!this._PreventDataLossDialog) {
                    this._PreventDataLossDialog = new Dialog({
                        type: "Message",
                        title: resourceBundle.getText("confirm"),
                        content: new Text({ text: resourceBundle.getText("discardChangesQuestion") }),
                        beginButton: new Button({
                            type: "Emphasized",
                            text: resourceBundle.getText("yes"),
                            press: function () {
                                
                                // discard all unsaved changes
                                that._discardAllUnsavedChanges();
                                
                                // Reinitialize the router
                                that.getRouter().initialize();

                                // Navigate to the route that was put on hold
                                if (that._onHoldNavigation.route !==""){
                                    router.navTo(that._onHoldNavigation.route, that._onHoldNavigation.params);
                                    that.setOnHoldNavigation();
                                } else {

                                    const history = History.getInstance();

                                    const previousHash = history.getPreviousHash();

                                    if (previousHash !== undefined) {
                                        window.history.go(-1);
                                    }

                                }

                                that._PreventDataLossDialog.close();
                            }
                        }),
                        endButton: new Button({
                            text: resourceBundle.getText("no"),
                            press: function () {
                                that._PreventDataLossDialog.close();
                            }
                        })
                    });
                }

                this._PreventDataLossDialog.open();

            } else {

                if (router.isStopped()) {
                    router.initialize();
                }
            }

            return this._isDirty;

        },

        setOnHoldNavigation: function(route = "", params = {}) {
            this._onHoldNavigation = {
                route: route,
                params: params
            };
        },

        getOnHoldNavigation: function() {
            return this._onHoldNavigation;
        },

        //################ Private APIs ###################

        _checkUnsavedChanges: function() {

            const models = ["apis", "rag", "tools", "agents"];
            
            for (const model of models) {

                this._isDirty = this.getModel(model).hasChanges();

                if (this._isDirty) {
                    console.log(`Model ${model} is dirty`);
                    break;
                }

            };

        },

        _discardAllUnsavedChanges: function() {

            const models = ["apis", "rag", "tools", "agents"];  
            
            models.forEach(element => {
                
                const model = this.getModel(element);

                if(model.hasChanges()){
                    model.rollback();
                }

            });
            
        }

    });
});