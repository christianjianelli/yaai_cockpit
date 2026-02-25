sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType"
], (BaseController, Messaging, IllustratedMessage, IllustratedMessageType) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Logs", {
        
        _dateFrom:"",
        _timeFrom:"",
        
        _dateTo: "",
        _timeTo: "",
        
        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteLogs").attachPatternMatched(this.onRouteMatched, this);

            let view = this.getView();

            let dynamicDateRange = view.byId("_IDLogsFilterDynamicDateRange");
            
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
                sideNavigation.setSelectedKey("logs");
            }
            
            Messaging.removeAllMessages();

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

            const table = view.byId("_IDLogsTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

        },

        onDateFilterChange: function (event) {
            
            this._dateFrom = "";
            this._dateTo = "";
            this._timeFrom = "000000";
            this._timeTo = "000000";

            if ( event.getParameter("value") !== undefined ) {
                
                let dates = event.getSource().toDates(event.getParameter("value"));
                
                this._dateFrom = this._formatDateYYYYMMDD(dates[0]);
                this._timeFrom = this._formatTimeHHMMSS(dates[0]);
                
                this._dateTo = this._formatDateYYYYMMDD(dates[1]);
                this._timeTo = this._formatTimeHHMMSS(dates[1]);
            }

        },
        
        onSearch: function (event) {
            
            const view = this.getView();

            const usernameInput = view.byId("_IDLogsUserNameFilter");

            let username;

            if (usernameInput) {
               username = usernameInput.getValue();
            }

            this._loadData(username);
          
        },

        //################ Private APIs ###################

        _loadData: async function(username = "") {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("logs");

            model.setData({logs: []});
            
            const endpoint = this.getEndpoint('log');
          
            const url = endpoint + "&datefrom=" + this._dateFrom + "&dateto=" + this._dateTo + "&timefrom=" + this._timeFrom + "&timeto=" + this._timeTo + "&username=" + username;

            const responseData = await this.fetchData(url);

            model.setData(responseData);

            view.setBusy(false);

        }
    })
});