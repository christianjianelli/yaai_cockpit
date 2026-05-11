sap.ui.define([
    "aaic/cockpit/controller/BaseController"
], (BaseController) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.NotFound", {
              
        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteNotFound").attachPatternMatched(this.onRouteMatched, this);
        
        },

        onRouteMatched: function (event) {

        }
        
    })
});