sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Messaging",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], (BaseController, UIComponent, Messaging, IllustratedMessage, IllustratedMessageType, Message, MessageType, MessageBox, Dialog, Button, Text) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Chats", {

        _dateFrom:"",
        
        _dateTo: "",

        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteChats").attachPatternMatched(this.onRouteMatched, this);

            let view = this.getView();

            let dynamicDateRange = view.byId("_IDChatsFilterDynamicDateRange");
            
            let today = {
                "operator": "TODAY",
                "values": []
            };

            dynamicDateRange.setValue(today);

            this._dateFrom = this._formatDateYYYYMMDD(new Date());
            this._dateTo = this._formatDateYYYYMMDD(new Date());

        },

        onRouteMatched: function (event) {

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("chats");
            }

            Messaging.removeAllMessages();

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

            const table = view.byId("_IDChatsTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

        },

        onItemPress: function (event) {

            const id = event.getSource().getBindingContext("chats").getProperty("id");

            const router = UIComponent.getRouterFor(this);

            router.navTo("RouteChat", { id: id });

        },

        onDateFilterChange: function (event) {
            
            this._dateFrom = "";
            this._dateTo = "";

            if ( event.getParameter("value") !== undefined ) {
                
                let dates = event.getSource().toDates(event.getParameter("value"));
                
                this._dateFrom = this._formatDateYYYYMMDD(dates[0]);
                
                this._dateTo = this._formatDateYYYYMMDD(dates[1]);
            }

        },

        onSearch: function (event) {
            
            const view = this.getView();

            const usernameInput = view.byId("_IDChatsUserNameFilter");

            let username;

            if (usernameInput) {
               username = usernameInput.getValue();
            }

            this._loadData(username);
          
        },

        onBlock: async function (event) {

            const view = this.getView();

            const model = view.getModel("chats");
            
            const modelData = model.getData();

            const table = view.byId("_IDChatsTable");

            let selectedItems = [];

            if (table) {
                selectedItems = table.getSelectedItems();
            }
            
            if (selectedItems.length === 0) {
                return;
            }

            view.setBusy(true);

            const endpoint = this.getEndpoint('chat');

            for (const item of selectedItems) {
             
                const formData = new FormData();

                // Fill form data
                formData.append('chat_id', item.getBindingContext("chats").getProperty("id"));
                formData.append('action', 'block');
                            
                try {

                    // 1. Await the fetch call. This pauses execution until the response is received.
                    const response = await fetch(endpoint, {
                        method: 'PUT',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        // Throw an error to be caught by the catch block
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // 2. Await the response.json() call to parse the body.
                    const responseData = await response.json();

                    // 3. Handle the successful data
                    if (responseData.updated) {

                        console.log('Chat Id ' + item.getBindingContext("chats").getProperty("id") + ' blocked. Chat Id ');

                        for (const chat of modelData.chats) {
                            
                            if (chat.id === item.getBindingContext("chats").getProperty("id")) {
                                
                                chat.blocked = true;

                                break;

                            }
                        }

                    } else {

                        const message = new Message({
                            message: 'Chat Id ' + item.getBindingContext("chats").getProperty("id") + ' NOT blocked.',
                            description: responseData.error,
                            type: MessageType.Error
                        });
                    
                        Messaging.addMessages(message);

                    }
        
                } catch (error) {
                    // 4. Handle any errors during the fetch or parsing process
                    console.error('Block operation failed:', error);
                }

            }

            model.setData(modelData);

            view.setBusy(false);

            if (table) {
                table.removeSelections();
            }

        },

        onRelease: async function (event) {

            const view = this.getView();

            const model = view.getModel("chats");
            
            const modelData = model.getData();
            
            const table = view.byId("_IDChatsTable");

            let selectedItems = [];

            if (table) {
                selectedItems = table.getSelectedItems();
            }
            
            if (selectedItems.length === 0) {
                return;
            }

            view.setBusy(true);

            const endpoint = this.getEndpoint('chat');

            for (const item of selectedItems) {
             
                const formData = new FormData();

                const chatId = item.getBindingContext("chats").getProperty("id");

                // Fill form data
                formData.append('chat_id', chatId);
                formData.append('action', 'release');
                            
                try {

                    // 1. Await the fetch call. This pauses execution until the response is received.
                    const response = await fetch(endpoint, {
                        method: 'PUT',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        // Throw an error to be caught by the catch block
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // 2. Await the response.json() call to parse the body.
                    const responseData = await response.json();

                    // 3. Handle the successful data
                    if (responseData.updated) {

                        console.log('Chat Id ' + chatId + ' released. Chat Id ');

                        for (const chat of modelData.chats) {
                            
                            if (chat.id === chatId) {
                                
                                chat.blocked = false;

                                break;

                            }
                        }

                    } else {

                        const message = new Message({
                            message: 'Chat Id ' + chatId + ' NOT released.',
                            description: responseData.error,
                            type: MessageType.Error
                        });
                    
                        Messaging.addMessages(message);

                    }
        
                } catch (error) {
                    // 4. Handle any errors during the fetch or parsing process
                    console.error('Release operation failed:', error);
                }

            }

            model.setData(modelData)

            view.setBusy(false);

            if (table) {
                table.removeSelections();
            }

        },

        onDelete: async function (event) {

            const view = this.getView();
            
            const resourceBundle = view.getModel("i18n").getResourceBundle();
            
            const table = view.byId("_IDChatsTable");
            
            let selectedItems = [];

            if (table) {
                selectedItems = table.getSelectedItems();
            }

            if (selectedItems.length === 0) {
                return;
            }

            if (selectedItems.length > 1) {
                MessageBox.information(resourceBundle.getText("multipleChatsDeletionNotAllowed"));
                return;
            }

            if (!this._confirmDialog) {
                    
                this._confirmDialog = new Dialog({
                    id: "_IDChatsConfirmDialogDelete",
                    type: "Message",
                    title: resourceBundle.getText("confirm"),
                    content: new Text({ text: resourceBundle.getText("confirmDeleteChats") }),
                    beginButton: new Button({
                        type: "Emphasized",
                        text: resourceBundle.getText("yes"),
                        press: function () {         
                            this._confirmDialog.setBusy(true);              
                            for (const item of selectedItems) {
                                const chatId = item.getBindingContext("chats").getProperty("id")
                                this._delete(chatId);
                            }
                            if (table) {
                                table.removeSelections();
                            }                           
                            this._confirmDialog.setBusy(false);
                            this._confirmDialog.close();
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: resourceBundle.getText("cancel"),
                        press: function () {
                            this._confirmDialog.close();
                        }.bind(this)
                    })
                });
            }

            this._confirmDialog.open();

        },

        //################ Private APIs ###################

        _loadData: async function(username = "") {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("chats");

            model.setData({chats: []});
            
            const endpoint = this.getEndpoint('chat');

            try {
          
                const responseData = await this.fetchData(endpoint + "&datefrom=" + this._dateFrom + "&dateto=" + this._dateTo + "&username=" + username);

                model.setData(responseData);

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

        _delete: async function(id) {

            const view = this.getView();

            const model = view.getModel("chats");
            
            const modelData = model.getData();
            
            const endpoint = this.getEndpoint('chat');

            const formData = new FormData();

            // Fill form data
            formData.append('chat_id', id);
                        
            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint, {
                    method: 'DELETE',
                    body: formData
                });
                
                if (!response.ok) {
                    // Throw an error to be caught by the catch block
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 2. Await the response.json() call to parse the body.
                const responseData = await response.json();

                // 3. Handle the successful data
                if (responseData.deleted) {

                    console.log('Chat Id ' + id + ' deleted.');

                    // Remove deleted tool from the local JSON Model
                    const chats = modelData.chats.filter((chat) => chat.id !== id );

                    modelData.chats = chats;

                    model.setData(modelData);

                } else {

                    const message = new Message({
                        message: 'Chat Id ' + id + ' NOT deleted.',
                        description: responseData.error,
                        type: MessageType.Error
                    });
                
                    Messaging.addMessages(message);

                }
    
            } catch (error) {
                
                // 4. Handle any errors during the fetch or parsing process
                console.error('Delete operation failed:', error);
                
            }
        
        }
    });
});