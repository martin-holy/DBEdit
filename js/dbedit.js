if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match;
    });
  };
}

var DBEdit = DBEdit || {};
DBEdit.GridData = null;

DBEdit.CreateGrid = function (tableName, page = 1, limit = 200, sidx = 1, sord = '') {
  DBEdit.GridTableName = tableName;
  var http = new XMLHttpRequest();
  http.open('POST', 'dbedit.php?act=grid&tableName={0}&page={1}&limit={2}&sidx={3}&sord={4}'.format(tableName, page, limit, sidx, sord), true);
  http.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
  http.send(JSON.stringify({tableName: tableName}));
  http.onload = function() {
    DBEdit.GridData = JSON.parse(http.responseText);
    var grid = '<table class="grid"><thead><tr>';

    //header
    var header = DBEdit.GridData.Header;
    for (var i = 0; i < header.length; i++) {
      grid += '<th>{0}</th>'.format(header[i].DisplayName);
    }
    grid += '</tr></thead><tbody>';

    //data
    var rows = DBEdit.GridData.Data;
    for (var i = 0; i < rows.length; i++) {
      grid += '<tr onClick="DBEdit.EditRecord({0});">'.format(i);
      for (var j = 0; j < rows[i].length; j++) {
        var val = rows[i][j];
        if (val == null) {
          val = '';
        } else {
          if (header[j].ReplaceWith != null) {
            val = DBEdit.GridData.LookUps[j][val];
          }
          if (header[j].EditAs == 'checkbox') {
            val = val == '0' ? '' : '&#9745';
          }
        }

        grid += '<td>{0}</td>'.format(val);
      }
      grid += '</tr>';
    }

    document.getElementById('grid').innerHTML = grid;
  }
}

//Generate Edit form and shows it
DBEdit.EditRecord = function (idx) {
  var isNew = idx == -1 ? true : false;
  var header = DBEdit.GridData.Header;
  var editForm = document.createElement('form');
  var editTable = document.createElement('table');
  var editDiv = document.getElementById('edit');

  editDiv.innerHTML = '';
  editDiv.appendChild(editForm);
  editForm.name = 'editForm';
  editForm.appendChild(editTable);

  for (var i = 0; i < header.length; i++) {
    var val = isNew ? header[i].Default : DBEdit.GridData.Data[idx][i];
    var row = editTable.insertRow();
    row.insertCell().textContent = header[i].DisplayName;
    row.insertCell().appendChild(DBEdit.GetInput(i, val));
  }

  var edit = '<a href="#" onClick="DBEdit.SaveRecord({0}); return false;">Save</a>'.format(idx);
  edit += '<a href="#" onClick="DBEdit.CancelEdit(); return false;">Cancel</a>';
  edit += '<a href="#" onClick="DBEdit.DeleteRecord({0}); return false;" {1}>Delete</a>'.format(idx, idx == -1 ? 'disable' : '');

  var buttons = document.createElement('div');
  editDiv.appendChild(buttons);
  buttons.setAttribute('class', 'flexF');
  buttons.innerHTML = edit;
  
  editDiv.style.display = 'block';
};

//Generate corect input for editing
DBEdit.GetInput = function (colIdx, val) {
  var col = DBEdit.GridData.Header[colIdx];

  if (col.EditAs == 'datetime') col.EditAs = 'datetime-local';
  if (col.EditAs == 'varchar') col.EditAs = 'text';

  var elem = null;
  switch (col.EditAs) {
    case 'textarea': {
      elem = document.createElement('textarea');
      elem.value = val;
      break;
    }
    case 'select': {
      elem = document.createElement('select');
      var lookUp = DBEdit.GridData.LookUps[colIdx];
      for (var id in lookUp) {
        elem.appendChild(new Option(lookUp[id], id));
        if (id == val) elem.selectedIndex = elem.childElementCount -1;
      }
      break;
    }
    case 'checkbox': {
      elem = document.createElement('input');
      elem.setAttribute('type', col.EditAs);
      elem.checked = val == 1;
      break;
    }
    case 'number': {
      var numericScale = col.NumericScale == null ? 0 : parseInt(col.NumericScale);
      elem = document.createElement('input');
      elem.setAttribute('type', col.EditAs);
      elem.placeholder = numericScale == 0 ? '0' : '0.'+'0'.repeat(numericScale);
      elem.step = elem.placeholder.substring(0, elem.placeholder.length - 1) + '1';
      elem.value = val;
      break;
    }
    default: {
      elem = document.createElement('input');
      elem.setAttribute('type', col.EditAs);
      elem.value = val;
      break;
    }
  }

  elem.required = col.Required == true;
  elem.readonly = col.ReadOnly == true;
  elem.id = '__' + col.Name;

  return elem;
};

//Cancel Edit
DBEdit.CancelEdit = function () {
  DBEdit.HideEdit();
};

//Hide Edit form
DBEdit.HideEdit = function () {
  document.getElementById('edit').style.display = 'none';
};

//Save Record
DBEdit.SaveRecord = function (idx) {
  var form = document.forms.namedItem('editForm');
  var oField, oFieldValue = "";
  var data = [];
  for (var i = 0; i < form.elements.length; i++) {
    oField = form.elements[i];
    switch (oField.type) {
      case 'checkbox':
        oFieldValue = oField.checked;
        break;
      case 'number':
        oFieldValue = oField.valueAsNumber;
        break;
      case 'select-one':
        oFieldValue = parseInt(oField.value);
        break;
      default:
        oFieldValue = oField.value;
        break;
    }
    if (!oField.required && oFieldValue == '') 
      oFieldValue = null;
    data[i] = [oField.id, oFieldValue];
  }

  var http = new XMLHttpRequest();
  http.open('POST', 'dbedit.php?act=saveRecord&tableName={0}'.format(DBEdit.GridTableName), true);
  http.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
  http.send(JSON.stringify(data));
  http.onload = function() {
    var response = JSON.parse(http.responseText);
    //TODO react on response
    DBEdit.HideEdit();
    DBEdit.CreateGrid(DBEdit.GridTableName);
  }

}