sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent"
], (BaseController, UIComponent) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Main", {
        
        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("home");
            }

            this._loadData();

        },

        handleLinkPress: function (api) {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.navTo("RouteApi", { id: api.toUpperCase() });

        },

        onApiTilePress: function (api) {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.navTo("RouteApi", { id: api.toUpperCase() });

        },

        onTilePress: function (route) {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.navTo(route);

        },

        //################ Private APIs ###################

        _loadData: async function(refreshStats = false) {

            //return;
            
            const view = this.getView();

            const model = view.getModel("stats");

            const modelData = model.getData();

            if (modelData.tools && !refreshStats) {
                return;
            }

            //view.setBusy(true);
            this._setTilesState('Loading');
         
            const endpoint = this.getEndpoint('stats');
          
            try {
                
                const stats = await this.fetchData(endpoint);

                model.setData(stats);

                //view.setBusy(false);
                this._setTilesState('Loaded');

            } catch (error) {
                //Do nothing ...
            }

        },

        _setTilesState: async function(state) {

            const view = this.getView();

            const tilesIds = ['_IDMainGenericTileTools', 
                              '_IDMainGenericTileDocuments',
                              '_IDMainGenericTileAgents',
                              '_IDMainGenericTileChats',
                              '_IDMainGenericTileLogs',
                              '_IDMainGenericTileAsyncTasks'];

            tilesIds.forEach(tileId => {

                const tile = view.byId(tileId);

                tile.setState(state);
                
            });                          

        }

    });
});