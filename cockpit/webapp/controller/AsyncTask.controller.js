sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType",
    "sap/ui/core/Messaging"
], (BaseController, IllustratedMessage, IllustratedMessageType, Messaging) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.AsyncTask", {
        
        _id:"",
        
        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteAsyncTask").attachPatternMatched(this.onRouteMatched, this);
        
        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("async");

            let modelData = model.getData();

            if (modelData.tasks) {

                let index = modelData.tasks.findIndex( task => task.id === args.id );
                
                view.bindElement({
                    path: `/tasks/${index}`,
                    model: "async"
                });

            }

            this._id = args.id;
            
            Messaging.removeAllMessages();

            this._loadData();

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

        },

        //################ Private APIs ###################

        _loadData: async function() {

            const view = this.getView();

            view.setBusy(true);
         
            const endpoint = this.getEndpoint('async_task');
          
            const responseData = await this.fetchData(endpoint + "&id=" + this._id);

            const task = {
                    id: responseData.task.id,
                    chatId: responseData.task.chatId,
                    name: responseData.task.name,
                    status: responseData.task.status,
                    username: responseData.task.username,
                    startDate: responseData.task.startDate,
                    startTime: responseData.task.startTime,
                    endDate: responseData.task.endDate,
                    endTime: responseData.task.endTime,
                    response: responseData.task.response
                };

            let model = view.getModel("async");

            let modelData = model.getData();

            let index = 0;

            if (!modelData.tasks) {
            
                modelData.tasks = [];
            
                modelData.tasks.push(task);
            
            } else {
                
                index = modelData.tasks.findIndex( task => task.id === this._id );
                
                if(!modelData.tasks[index]) {
                   
                    modelData.tools.push(task);
                
                } else {
                    
                    modelData.tasks[index].task = task;
                }

                model.setData(modelData);
            }

            view.bindElement({
                path: `/tasks/${index}`,
                model: "async"
            });

            view.setBusy(false);

        }
    });
});