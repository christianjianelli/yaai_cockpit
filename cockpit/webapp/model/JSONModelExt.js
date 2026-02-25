sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    return JSONModel.extend("JSONModelExt", {

        // --- State Variables ---
        // The main property to track the dirty state
        _hasChanges: false,

        // The deep clone of the model data when it was last considered 'clean'
        _originalData: null,

        // --- Private Helper to Clone Original Data ---
        _cloneOriginalData: function () {
            // Use Lodash's deep clone (cloneDeep) for reliable comparison
            this._originalData = _.cloneDeep(this.getData());
        },

        /**
         * Explicitly sets the dirty state.
         * @param {boolean} hasChanges The new dirty state.
         */
        setHasChanges: function (hasChanges) {
            this._hasChanges = hasChanges;
        },

        /**
         * Compares the current model data with the original data clone.
         * Updates the internal dirty state variable.
         */
        hasChanges: function () {

            if (!this._originalData){
                return false;
            }
            
            // Use Lodash's deep comparison (isEqual)
            const isEqual = _.isEqual(this.getData(), this._originalData);
            this._hasChanges = !isEqual;
            return this._hasChanges;
        },

        /**
         * Set the model's initial data and mark it as clean.
         */
        setModelData: function (modelData) {
            this.setData(modelData);
            this._cloneOriginalData(modelData);
            this.setHasChanges(false);
        },

        /**
         * Update the model's data and mark it as dirty.
         */
        updateModelData: function (modelData) {
            this.setData(modelData);
            this.setHasChanges(true);
        },

        /**
         * Commit (locally) changes to the model's data and mark it as clean.
         */
        commit: function () {
            this._cloneOriginalData();
            this.setHasChanges(false);
        },

        /**
         * Restore (locally) the model's original data and mark it as clean.
         */
        rollback: function () {
            if (this._originalData) {
                this.setModelData(_.cloneDeep(this._originalData));
            }
            this.setHasChanges(false);
        }

    });

});