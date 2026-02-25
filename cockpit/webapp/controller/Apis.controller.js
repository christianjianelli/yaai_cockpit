sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/m/MessageBox"
], (BaseController, UIComponent, Messaging, Message, MessageType, MessageBox) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Apis", {
        
        onInit() {
            
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteApis").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            this._loadData();

        },

        onItemPress: function (event) {

            const id = event.getSource().getBindingContext("apis").getProperty("id");

            const router = UIComponent.getRouterFor(this);

            router.navTo("RouteApi", { id: id });

        },

        //################ Private APIs ###################

        _loadData: async function() {

            const view = this.getView();

            view.setBusy(true);

            let model = view.getModel("apis");
            
            const endpoint = this.getEndpoint('llm_api');

            try {
                
                const modelData = await this.fetchData(endpoint);

                model.setModelData(modelData);

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

        }
    })
});