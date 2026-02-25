sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (BaseController, Messaging, Message, MessageType, MessageToast, MessageBox) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Api", {
        
        _api: "",

        _edit: false,
        
        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteApi").attachPatternMatched(this.onRouteMatched, this);
        
        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");
            
            this._api = args.id.toUpperCase();

            this._edit = false;

            Messaging.removeAllMessages();

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey(this._api.toLowerCase() + "-api");
            }

            this._setEditMode(this._edit);

            this._loadData();

            this.getView().focus();

        },

        onSave: function (event) {

            this._updateApi(this.getView());

        },

        onSetDefault: function (event) {

            const view = this.getView();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const table = view.byId("_IDApiModelsTable");

            const selectedItems = table.getSelectedItems();

            if (selectedItems.length === 0) {
                return;
            }

            if (selectedItems.length > 1) {

                MessageToast.show(resourceBundle.getText("multipleDefaultModelErrorDescription"));

                return;

            }

            const model = view.getModel("apis");

            const modelData = model.getData();

            const index = modelData.apis.findIndex(api => api.id === this._api);

            const selectedModel = selectedItems[0].getBindingContext("apis").getProperty("model");

            modelData.apis[index].models.forEach(element => {               
                if (element.model !== selectedModel) {
                    element.defaultModel = false;
                    return;
                }
                element.defaultModel = true;
            });

            model.updateModelData(modelData);

        },

        onAdd: function(event) {
           
            this.onOpenDialog();  

        },

        onDelete: function(event) {
           
            const view = this.getView();

            const table = view.byId("_IDApiModelsTable");

            let selectedItems = [];

            if (table) {
                selectedItems = table.getSelectedItems();
            }

            if (selectedItems.length === 0) {
                return;
            }

            const model = view.getModel("apis");

            const modelData = model.getData();

            const index = modelData.apis.findIndex(api => api.id === this._api);

            let models = modelData.apis[index].models;

            selectedItems.forEach(element => {
                let deletedModel = element.getBindingContext("apis").getProperty("model");
                console.log(deletedModel);
                models = models.filter(item => item.model !== deletedModel);
            });

            if (table) {
                table.removeSelections();
            }

            modelData.apis[index].models = models;
            
            model.updateModelData(modelData);

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

        },

        onAddModel: function(event) {
           
            const view = this.getView();

            const model = view.getModel('apis');

            const modelData = model.getData();

            const llm = view.byId('_IDAddModelInput').getValue();

            const index = modelData.apis.findIndex(api => api.id === this._api);

            modelData.apis[index].models.push({
                "model": llm,
                "defaultModel": false
            });

            model.updateModelData(modelData);

            view.byId('_IDAddModelInput').setValue("");

            this.Dialog.close();
   
        },

        onOpenDialog: async function() {

			// Create dialog lazily
			this.Dialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.AddModel",
                controller: this
			});

			this.Dialog.open();
		},

        onCloseDialog: function(event) {
            
            this.Dialog.close();

        },

        onToogleEdit: function(event) {

            if (this._edit === true) {

                const view = this.getView();

                const model = view.getModel("apis");

                if (model.hasChanges()) {

                    model.rollback();

                }

            }
            
            this._edit = !this._edit;

            this._setEditMode(this._edit);

        },

        //################ Private APIs ###################

        _loadData: async function() {
         
            const view = this.getView();

            view.setBusy(true);

            let model = view.getModel("apis");
            
            const endpoint = this.getEndpoint('llm_api');

            try {
                
                const modelData = await this.fetchData(endpoint);

                const index = modelData.apis.findIndex(api => api.id === this._api);

                model.setModelData(modelData);

                view.bindElement({
                    path: `/apis/${index}`,
                    model: "apis"
                });

                view.setBusy(false);

            } catch (error) {

                view.setBusy(false);

                MessageBox.error(error.message);

                const resourceBundle = view.getModel("i18n").getResourceBundle();

                const message = new Message({
                    message: error.message,
                    description: resourceBundle.getText("communicationError"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }

        },

        _isValid: function(view) {

            Messaging.removeAllMessages();

            let modelData = view.getModel('apis').getData();

            let index = modelData.apis.findIndex(api => api.id === this._api);
            
            let isValid = modelData.apis[index].models.filter(m => m.defaultModel).length <= 1;

            if (isValid === false) {

                const resourceBundle = view.getModel("i18n").getResourceBundle();

                const message = new Message({
                    message: resourceBundle.getText("multipleDefaultModelError"),
                    description: resourceBundle.getText("multipleDefaultModelErrorDescription"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);
            }    

            return isValid;

        },

        _updateApi: async function(view) {

            let model = view.getModel('apis');

            let modelData = model.getData();

            if (this._isValid(view) === false) {
                return;
            }

            let index = modelData.apis.findIndex(api => api.id === this._api);
            
            const options = {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
                body: JSON.stringify(modelData.apis[index])
			};

            view.setBusy( true );

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const endpoint = this.getEndpoint('llm_api');

            try {
                
                const responseData = await this.fetchData(endpoint, options);

                if (responseData.updated === true) {
                
                    MessageToast.show(resourceBundle.getText('changesSaved'));

                    model.commit();

                }

                view.setBusy( false );

            } catch (error) {

                view.setBusy( false );

                MessageBox.error(error.message);

                const message = new Message({
                    message: error.message,
                    description: resourceBundle.getText("communicationError"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }
            
        },

        _setEditMode: function(editable) {
                        
            const view = this.getView();

            const idsEditable = ["_IDApiBaseUrlInput"];

            const idsEnable = ["_IDApiButtonSave",
                               "_IDApiOverflowToolbarButtonAdd",
                               "_IDApiOverflowToolbarButtonSetDefault",
                               "_IDApiOverflowToolbarButtonDelete"];                

            idsEditable.forEach(id => {
                let control = view.byId(id);
                if (control) {
                    control.setEditable(editable);
                }
            });
            
            idsEnable.forEach(id => {
                let control = view.byId(id);
                if (control) {
                    control.setEnabled(editable);
                }
            });

        }

    });
});