sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], (BaseController, UIComponent, IllustratedMessage, IllustratedMessageType, Messaging, Message, MessageType, MessageBox, Dialog, Button, Text) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.AsyncTasks", {
        
        _dateFrom:"",
        
        _dateTo: "",

        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteAsyncTasks").attachPatternMatched(this.onRouteMatched, this);

            let view = this.getView();

            let dynamicDateRange = view.byId("_IDAsyncTasksFilterDynamicDateRange");
            
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
                sideNavigation.setSelectedKey("async-tasks");
            }

            Messaging.removeAllMessages();
            
        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

            const table = view.byId("_IDAsyncTasksTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

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

            const username = view.byId("_IDAsyncTasksUserNameFilter").getValue();
            
            this._loadData(username);
          
        },

        onItemPress: function (event) {

            const id = event.getSource().getBindingContext("async").getProperty("id");

            const router = UIComponent.getRouterFor(this);

            router.navTo("RouteAsyncTask", { id: id });

        },

        onCancel: async function (event) {

            const view = this.getView();
            
            const resourceBundle = view.getModel("i18n").getResourceBundle();
            
            const table = view.byId("_IDAsyncTasksTable");
            
            let selectedItems = [];

            if (table) {
                selectedItems = table.getSelectedItems();
            }

            if (selectedItems.length === 0) {
                return;
            }

            if (!this._confirmDialog) {
                    
                this._confirmDialog = new Dialog({
                    id: "_IDAsyncTasksConfirmDialog",
                    type: "Message",
                    title: resourceBundle.getText("confirm"),
                    content: new Text({ text: resourceBundle.getText("confirmCancelAsyncTasks") }),
                    beginButton: new Button({
                        type: "Emphasized",
                        text: resourceBundle.getText("yes"),
                        press: async function () {         
                            this._confirmDialog.setBusy(true);              
                            for (const item of selectedItems) {
                                const asyncTaskId = item.getBindingContext("async").getProperty("id")
                                await this._cancel(asyncTaskId);
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

        _loadData: async function(username) {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("async");

            model.setData({logs: []});
            
            const endpoint = this.getEndpoint('async_task');

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

        _cancel: async function(asyncTaskId) {

            const view = this.getView();

            const model = view.getModel("async");
            
            const modelData = model.getData();
            
            const endpoint = this.getEndpoint('async_task');

            const formData = new FormData();

            // Fill form data
            formData.append('async_task_id', asyncTaskId);
            formData.append('action', 'cancel');
                        
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

                    console.log('Async Task Id ' + asyncTaskId + ' cancelled.');

                    for (const task of modelData.tasks) {
                            
                        if (task.id === asyncTaskId) {
                            
                            task.cancelled = true;

                            break;

                        }
                    }

                    model.setData(modelData);

                } else {

                    const message = new Message({
                        message: 'Async Task Id ' + asyncTaskId + ' NOT cancelled.',
                        description: responseData.error,
                        type: MessageType.Error
                    });
                
                    Messaging.addMessages(message);

                }
    
            } catch (error) {
                
                // 4. Handle any errors during the fetch or parsing process
                console.error('Async Task cancel operation failed:', error);
                
            }

        }
    });
});