WorkspaceDiff.WorkspaceDiff=class extends Common.Object{constructor(workspace){super();this._uiSourceCodeDiffs=new WeakMap();this._loadingUISourceCodes=new Map();this._modifiedUISourceCodes=new Set();workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyChanged,this._uiSourceCodeChanged,this);workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted,this._uiSourceCodeChanged,this);workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved,this);workspace.uiSourceCodes().forEach(this._updateModifiedState.bind(this));}
requestDiff(uiSourceCode){return this._uiSourceCodeDiff(uiSourceCode).requestDiff();}
subscribeToDiffChange(uiSourceCode,callback,thisObj){this._uiSourceCodeDiff(uiSourceCode).addEventListener(WorkspaceDiff.Events.DiffChanged,callback,thisObj);}
unsubscribeFromDiffChange(uiSourceCode,callback,thisObj){this._uiSourceCodeDiff(uiSourceCode).removeEventListener(WorkspaceDiff.Events.DiffChanged,callback,thisObj);}
modifiedUISourceCodes(){return Array.from(this._modifiedUISourceCodes);}
_uiSourceCodeDiff(uiSourceCode){if(!this._uiSourceCodeDiffs.has(uiSourceCode))
this._uiSourceCodeDiffs.set(uiSourceCode,new WorkspaceDiff.WorkspaceDiff.UISourceCodeDiff(uiSourceCode));return this._uiSourceCodeDiffs.get(uiSourceCode);}
_uiSourceCodeChanged(event){var uiSourceCode=(event.data.uiSourceCode);this._updateModifiedState(uiSourceCode);}
_uiSourceCodeAdded(event){var uiSourceCode=(event.data);this._updateModifiedState(uiSourceCode);}
_uiSourceCodeRemoved(event){var uiSourceCode=(event.data);this._loadingUISourceCodes.delete(uiSourceCode);this._markAsUnmodified(uiSourceCode);}
_projectRemoved(event){var project=(event.data);for(var uiSourceCode of project.uiSourceCodes()){this._loadingUISourceCodes.delete(uiSourceCode);this._markAsUnmodified(uiSourceCode);}}
_markAsUnmodified(uiSourceCode){this._uiSourceCodeProcessedForTest();if(this._modifiedUISourceCodes.delete(uiSourceCode))
this.dispatchEventToListeners(WorkspaceDiff.Events.ModifiedStatusChanged,{uiSourceCode,isModified:false});}
_markAsModified(uiSourceCode){this._uiSourceCodeProcessedForTest();if(this._modifiedUISourceCodes.has(uiSourceCode))
return;this._modifiedUISourceCodes.add(uiSourceCode);this.dispatchEventToListeners(WorkspaceDiff.Events.ModifiedStatusChanged,{uiSourceCode,isModified:true});}
_uiSourceCodeProcessedForTest(){}
async _updateModifiedState(uiSourceCode){this._loadingUISourceCodes.delete(uiSourceCode);if(uiSourceCode.project().type()!==Workspace.projectTypes.Network){this._markAsUnmodified(uiSourceCode);return;}
if(uiSourceCode.isDirty()){this._markAsModified(uiSourceCode);return;}
if(!uiSourceCode.history().length){this._markAsUnmodified(uiSourceCode);return;}
var contentsPromise=Promise.all([uiSourceCode.requestOriginalContent(),uiSourceCode.requestContent()]);this._loadingUISourceCodes.set(uiSourceCode,contentsPromise);var contents=await contentsPromise;if(this._loadingUISourceCodes.get(uiSourceCode)!==contentsPromise)
return;this._loadingUISourceCodes.delete(uiSourceCode);if(contents[0]!==null&&contents[1]!==null&&contents[0]!==contents[1])
this._markAsModified(uiSourceCode);else
this._markAsUnmodified(uiSourceCode);}};WorkspaceDiff.WorkspaceDiff.UISourceCodeDiff=class extends Common.Object{constructor(uiSourceCode){super();this._uiSourceCode=uiSourceCode;uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeChanged,this);uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeChanged,this);this._requestDiffPromise=null;this._pendingChanges=null;}
_uiSourceCodeChanged(){if(this._pendingChanges){clearTimeout(this._pendingChanges);this._pendingChanges=null;}
this._requestDiffPromise=null;var content=this._uiSourceCode.content();var delay=(!content||content.length<65536)?0:WorkspaceDiff.WorkspaceDiff.UpdateTimeout;this._pendingChanges=setTimeout(emitDiffChanged.bind(this),delay);function emitDiffChanged(){this.dispatchEventToListeners(WorkspaceDiff.Events.DiffChanged);this._pendingChanges=null;}}
requestDiff(){if(!this._requestDiffPromise)
this._requestDiffPromise=this._innerRequestDiff();return this._requestDiffPromise;}
async _innerRequestDiff(){var current=this._uiSourceCode.workingCopy();if(!current&&!this._uiSourceCode.contentLoaded())
current=await this._uiSourceCode.requestContent();var baseline=await this._uiSourceCode.requestOriginalContent();if(current===null||baseline===null)
return null;return Diff.Diff.lineDiff(baseline.split('\n'),current.split('\n'));}};WorkspaceDiff.Events={DiffChanged:Symbol('DiffChanged'),ModifiedStatusChanged:Symbol('ModifiedStatusChanged')};WorkspaceDiff.workspaceDiff=function(){if(!WorkspaceDiff.WorkspaceDiff._instance)
WorkspaceDiff.WorkspaceDiff._instance=new WorkspaceDiff.WorkspaceDiff(Workspace.workspace);return WorkspaceDiff.WorkspaceDiff._instance;};WorkspaceDiff.WorkspaceDiff.UpdateTimeout=200;;