function ETable(table)
{
	var buttonAdd = null;
	var colDelete = null;
	var colSort = [];
	
	var canEdit = null;
	var CanEdit = function(ready)
	{
		if (canEdit === null)
		{
			Query("canEdit", function(success, data)
			{
				if (success && data)
					canEdit = true;
				else
					canEdit = false;
				ready(canEdit);
			});
		}
		else
		{
			ready(canEdit);
		}
	};
	
	var Query = function(request, done, data)
	{
		if (data == null)
			data = {};
		
		data.table = GetDBTableName();
		return $.ajax({
			url: GetQueryFileName() + '?request=' + request,
			type: 'GET',
			timeout: 60000,
			data: data,
			dataType: 'json',
			success: function(d, textStatus, jqXHR)
			{
				if (!d.error)
					done(true, d, textStatus, jqXHR);
				else
					done(false, d, textStatus, jqXHR);
				
				//if (d.error && d.error == 'permissions')
				//	alert('Недостаточно прав для выполнения операции');
			},
			error: function(d, textStatus, jqXHR)
			{
				done(false, d, textStatus, jqXHR);
			}
		});
	};
	
	function PostHeightMessage()
	{
		if (window.parent)
			window.parent.postMessage({etableHeight: document.body.offsetHeight}, "*");
	};
	
	var GetHeaderRow = function()
	{
		return table.rows[0];
	};
	
	var GetColumn = function(i)
	{
		return GetHeaderRow().cells[i].dataset;
	};
	
	var Sort = function(i)
	{
		if (colSort.length == 0)
			return;
		
		if (colSort[0] == i)
		{
			var col = GetColumn(i);
			if (col)
				col.sort = (col.sort == 0 ? 1 : 0);
		}
		else
		{
			var index = colSort.indexOf(i);
			var temp = colSort[index];
			colSort.splice(index, 1);
			colSort.unshift(temp);
		}
	};
	
	var GetSortString = function()
	{
		var sort = "";
		for (var i in colSort)
		{
			var col = GetColumn(colSort[i]);
			if (!col)
				continue;
			if (col.sort >= 0)
				sort += col.dbName + (col.sort == 0 ? ' asc' : ' desc') + ',';
		}
		return sort.replace(/,+$/, '');
	}
	
	var GetQueryFileName = function()
	{
		return table.dataset.queryFileName || 'etable.php';
	};
	
	var GetDBTableName = function()
	{
		return table.dataset.dbTableName || 'etable';
	};
	
	var GetIDColName = function()
	{
		return table.dataset.idName || 'ID';
	};
	
	var GetCondition = function()
	{
		return table.dataset.condition || '';
	};
	
	var SetStyle = function(obj, style)
	{
		if (!style)
			return;
		
		var s = JSON.parse(style);
		for (var name in s)
		{
			obj.style[name] = s[name];
		}
	};
	
	function AddRow(data, atBegin)
	{
		var tr = table.insertRow(!atBegin ? -1 : 1);
		SetStyle(tr, table.dataset.trStyle || null);
		tr.id = data[GetIDColName()];
		
		var len = GetHeaderRow().cells.length; 
		for (var i = 0; i < (canEdit ? len - 1 : len); i++)
		{
			var col = GetColumn(i);
			var td = tr.insertCell(-1);
			if (col)
			{
				td.id = col.dbName;
				SetStyle(td, col.style);
				td.innerHTML = data[col.dbName] || '';
				td.dataset.val = td.innerHTML;
			}
		}
		
		if (canEdit)
		{
			td = tr.insertCell(-1);
			td.innerHTML = 'x';
			td.style.color = 'red';
			td.onclick = function(e)
			{
				e.preventDefault();
				e.stopPropagation();
				if (confirm('Подтвердите удаление'))
				{
					var data = {};
					data.id = tr.id;
					data.idname = GetIDColName();
					Query("delete", function(success, d)
					{
						if (success && d)
						{
							$(tr).remove();
							PostHeightMessage();
						}
					},
					data);
				}
			}
			td.onkeydown = function(e)
			{
				if (e.which == 37 || e.which == 38 || e.which == 39 || e.which == 40 || e.which == 9)
					return true;
					
				if (e.which == 13)
				{
					td.blur();
					td.onclick(e);
				}

				e.preventDefault();
				e.stopPropagation();
			}
		}
		
		if (canEdit)
			$(tr).find('td').prop('tabindex', 1);
	};
	
	var DrawAddButton = function()
	{
		if (buttonAdd)
			return;
		
		var add = document.createElement('input');
		add.type = 'button';
		add.value = 'Добавить';
		add.style.marginBottom = '4px';
		table.parentElement.insertBefore(add, table);
		add.onclick = function()
		{
			Query("add", function(success, d)
			{
				if (success && d)
				{
					var data = {};
					data[GetIDColName()] = d;
					AddRow(data, true);
					$(table).find('td').first().focus();
					PostHeightMessage();
				}
			},
			{condition: GetCondition()});
		}
		buttonAdd = add;
	};
	
	var Load = function()
	{
		Query("load", function(success, d)
		{
			if (!success || !d)
				return;
			
			CanEdit(function(cedit)
			{
				if (cedit && !colDelete)
				{
					var th = document.createElement('th');
					th.dataset.sort = -1;
					GetHeaderRow().appendChild(th);
					colDelete = th;
				}
				
				for (var i in d)
				{
					AddRow(d[i]);
				}
				for (var i = 0; i < GetHeaderRow().cells.length; i++)
				{
					if (GetHeaderRow().cells[i].dataset.sort >= 0)
						GetHeaderRow().cells[i].style.cursor = "pointer";
				}
				
				if (cedit)
				{
					DrawAddButton();
					$(table).editableTableWidget();
				}
				PostHeightMessage();
			});
		},
		{sort: GetSortString(), condition: GetCondition()});
	}
	
	colSort = [];
	for (var i = 0; i < GetHeaderRow().cells.length; i++)
	{
		colSort.push(i);
	}
	Load();
	
	$(table).on('change', 'td', function(evt, newValue)
	{
		var oldValue = evt.target.dataset.val;
		var data = {};
		data.name = evt.target.id;
		data.value = newValue;
		data.id = evt.target.parentElement.id;
		data.idname = GetIDColName();
		Query("save", function(success, d)
		{
			if (!success || !d)
			{
				evt.target.innerHTML = oldValue;
			}
			else
			{
				evt.target.dataset.val = newValue;
				PostHeightMessage();
			}
		},
		data);
	});
	
	$(table).on('click', 'th', function(e)
	{
		if (e.target.dataset.sort < 0)
			return;
		
		Sort(e.target.cellIndex);
		
		while (table.rows.length > 1)
			table.deleteRow(1);
		
		Load();
	});
};
