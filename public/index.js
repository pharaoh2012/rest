
// #region 常量定义
const groups = [
    "6:早上任务",
    "12:午间任务",
    "18:晚间任务",
    "24:全天任务",
    "20:多次任务",
    "0:可选任务",
    "week:周任务",
    "month:月任务",
]

const users = ["_all",
    "jd1",
    "jd2",
    "xm1",
    "xm2",]

const types = [
    "1️⃣",
    "💲",
    "🛠",
    "⏰",
    "🏦",
    "🧧",
    "🔇",
    "《支付宝》",
    "《美团》",
    "《银行》",
    "《京东》",
    "《微信》",
    "《云闪付》",
    "《电信》",
]

const disables = [
    { label: '✅', value: '0' },
    { label: '❌', value: '1' },
    { label: '❓', value: '2' }
]

const tasks = ["m:月任务",
    "w:周任务",
    "d:日任务",
]

// #endregion
// #region 菜单
//define row context menu contents
const rowMenu = [
    {
        label: "复制本行",
        action: function (e, row) {
            const data = Object.assign({}, row.getData());
            const id = data.id;
            data.nameuser = data.nameuser + "_copy";
            data._id = undefined;
            data.id = getMaxId() + 1;
            data.index = data.index + 1;
            data.name = data.nameuser + data.类型.replace(/,/g, "");
            data.修改时间 = Date.now();
            table.addRow(data, false, id).then(newrow => {
                table.deselectRow();
                newrow.select();
                fetch("/v1/rest/tasks", {
                    method: "POST",
                    headers: {
                        'User-Agent': 'api',
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                    body: JSON.stringify(data)
                }).then(res => {
                    if (res.ok) {
                        console.log("添加成功");
                        return res.json();
                    }
                    else {
                        console.log("添加失败");
                        return null;
                    }
                }).then(json => {
                    console.log("添加成功", json);
                    if (json) {
                        newrow.update({ _id: json._id });
                    }
                }).catch(err => {
                    console.log(err);
                    showError("add error:" + err.message)
                })
            })
            // row.update({ name: "Steve Bobberson" });
        }
    },
    // {
    //     label: "<i class='fas fa-check-square'></i> Select Row",
    //     action: function (e, row) {
    //         row.select();
    //     }
    // },
    {
        label: "删除本行",
        action: function (e, row) {
            const data = row.getData();
            if (confirm(`确定要删除“${data.name}”吗？`)) {
                const id = data._id;
                fetch("/v1/rest/tasks/" + id, {
                    method: "DELETE"
                }).then(res => {
                    if (res.ok) {
                        console.log("删除成功");
                        row.delete();
                    }
                    else {
                        console.log("删除失败");
                        showError("删除失败!")
                    }
                }).catch(err => {
                    console.log("删除失败");
                    showError("删除失败:" + err.message)
                })
                //row.delete();
            }

        }
    },
    {
        separator: true,
    },
    {
        label: "分组",
        menu: [
            {
                label: "group",
                action: function (e, row) {
                    //row.delete();
                    console.log(e);
                    table.setGroupBy("group")
                }
            },
            {
                label: "type",
                action: function (e, row) {
                    //row.delete();
                    console.log(e);
                    table.setGroupBy("type")
                }
            },
            {
                label: "取消分组",
                action: function (e, row) {
                    //row.delete();
                    console.log(e);
                    table.setGroupBy()
                }
            },
        ]
    }
]

//define column header menu as column visibility toggle
const headerMenu = function () {
    var menu = [];
    var columns = this.getColumns();

    for (let column of columns) {
        // console.info(column.getDefinition().title)
        if (column.getDefinition().title === "#") continue;
        //create checkbox element using font awesome icons
        let icon = document.createElement("span");
        icon.classList.add("fas");
        icon.classList.add(column.isVisible() ? "fa-check-square" : "fa-square");
        icon.innerText = column.isVisible() ? "✅" : "❌";

        //build label
        let label = document.createElement("span");
        let title = document.createElement("span");

        title.textContent = " " + column.getDefinition().title;

        label.appendChild(icon);
        label.appendChild(title);

        //create menu item
        menu.push({
            label: label,
            action: function (e) {
                //prevent menu closing
                e.stopPropagation();

                //toggle current column visibility
                column.toggle();

                //change menu item icon
                if (column.isVisible()) {
                    icon.innerText = "✅";
                    icon.classList.remove("fa-square");
                    icon.classList.add("fa-check-square");
                } else {
                    icon.innerText = "❌";
                    icon.classList.remove("fa-check-square");
                    icon.classList.add("fa-square");
                }
            }
        });
    }

    return menu;
};
// #endregion


const disabledFormatter = function (cell, formatterParams, onRendered) {
    const values = cell.getValue();
    if (values == 1) {
        return "❌"
    }
    if (values == 2) {
        return "❓"
    }
    return "✅"
}

const timeFormatter = function (cell, formatterParams, onRendered) {
    const values = cell.getValue();
    if (values) {
        return new Date(values).toLocaleString()
    }
    return ""
}

function getMaxId() {
    return Math.max(...table.getData().map(d => d.id));
}

const table = new Tabulator("#example-table", {
    // 替换为ajax加载方式
    ajaxURL: "/v1/rest/tasks?limit=1000",          // 从JSON文件加载数据
    height: "100%",
    // rowHeight: 40,
    renderVertical: "basic", //disable virtual DOM rendering
    selectableRows: 1, //make rows selectable
    // layout: "fitData",      //fit columns to width of table
    // responsiveLayout: "hide",  //hide columns that don't fit on the table
    addRowPos: "top",          //when adding a new row, add it to the top of the table
    history: true,             //allow undo and redo actions on the table
    movableColumns: true,      //allow column order to be changed
    initialSort: [             //set the initial sort order of the data
        // { column: "group", dir: "asc" },
        { column: "index", dir: "asc" },
    ],
    groupBy: "group",
    columnDefaults: {
        tooltip: function (e, cell) {
            const v = cell.getValue();
            if (typeof v === "string") return cell.getValue().replace(/\n/g, "<br>");
            return v;
        },
    },
    rowContextMenu: rowMenu, //add context menu to rows
    headerContextMenu: headerMenu,
    initialHeaderFilter: [
        { field: "disabled", value: "0" } //set the initial value of the header filter to "red"
    ],
    columns: [
        { title: "#", formatter: "rownum", frozen: true, headerSort: false, hozAlign: "right", headerContextMenu: headerMenu },           //define the table columns
        { title: "Name", field: "nameuser", editor: "input", frozen: true, headerFilter: true, validator: "required", headerContextMenu: headerMenu, width: 150 },
        { title: "类型", field: "类型", editor: "list", frozen: false, headerContextMenu: headerMenu, headerFilter: "list", headerFilterParams: { values: types }, editorParams: { multiselect: true, values: types }, width: 100 },
        // { title: "disabled", field: "disabled", width: 95, editor: "list", editorParams: { multiselect: true, values: ["male", "female"] } },
        {
            title: "disabled", field: "disabled", editor: "list", formatter: disabledFormatter, headerContextMenu: headerMenu, hozAlign: "center", headerFilter: "list", validator: "required", headerFilterFunc: "=", headerFilterParams: { values: disables }, editorParams: { values: disables }, width: 50
        },
        {
            title: "group", field: "group", editor: "list", headerFilterFunc: "=", validator: "required", headerContextMenu: headerMenu, headerFilter: "list",  // 启用list类型筛选器
            headerFilterParams: { values: groups }, editorParams: { values: groups }, width: 100
        },
        { title: "index", field: "index", validator: "required", sorter: "number", editor: "number", headerFilter: true, hozAlign: "right", headerContextMenu: headerMenu, width: 50 },
        { title: "user", field: "user", validator: "required", editor: "list", headerFilter: "list", headerFilterParams: { values: users }, editorParams: { multiselect: true, values: users }, headerContextMenu: headerMenu, width: 80 },

        { title: "type", field: "type", validator: "required", editor: "list", headerFilterFunc: "=", headerFilter: "list", headerFilterParams: { values: tasks }, editorParams: { values: tasks }, headerContextMenu: headerMenu, width: 80 },
        { title: "cron", field: "cron", editor: "textarea", headerFilter: "tickCross", headerFilterParams: { "tristate": true }, headerFilterFunc: cronFilterFunction, headerContextMenu: headerMenu, width: 100 },
        { title: "备注", field: "备注", editor: true, headerFilter: true, width: 100, headerContextMenu: headerMenu, width: 100 },
        { title: "修改时间", field: "修改时间", editor: true, sorter: "number", headerFilter: false, formatter: timeFormatter, headerContextMenu: headerMenu, visible: false, width: 140 },
        { title: "url", field: "url", validator: "required", editor: "textarea", headerFilter: "input", width: 200, headerContextMenu: headerMenu },

    ],
});

function cronFilterFunction(headerValue, rowValue, rowData, filterParams) {
    // console.info({ headerValue, rowValue, rowData, filterParams })
    if (headerValue) {
        return !!rowValue;
    } else {
        return !rowValue;
    }
    return true;
}

// table.on("tableBuilt", function () {
//     //table.setFilter('disabled', '=', 0)
//     document.querySelector('div[tabulator-field="disabled"] input').value='✅'

// });

table.on("cellEdited", function (cell) {
    //cell - cell component
    const value = cell.getValue();
    if (value == cell.getOldValue()) {
        return
    }
    // console.log("cell changed:", cell.getData(), cell.getOldValue())
    const field = cell.getColumn().getField()
    const data = cell.getData()
    const updateValue = {
        [field]: value,
        修改时间: Date.now(),
        name: data.nameuser + data.类型.replace(/,/g, "")
    }
    cell.getRow().update({ 修改时间: Date.now() })
    const _id = cell.getData()._id
    console.log("updateValue:", updateValue)
    fetch(`/v1/rest/tasks/${_id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updateValue)
    }).then(res => res.json()).then(data => {
        console.log("update success:", data)
    }).catch(err => {
        console.log("update error:", err)
        showError("update error:" + err.message)
    })
    // save to local storage
    // cell.getValue()
});

function showError(message) {
    table.alert("❌" + message)
    setTimeout(() => {
        table.clearAlert()
    }, 3000);
}


