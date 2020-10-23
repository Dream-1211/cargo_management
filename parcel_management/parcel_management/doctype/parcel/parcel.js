function calculate_parcel_total(frm) {
    // Calculate the 'total' field on Parcel Doctype(Parent)
    frm.doc.total = frm.get_sum('content', 'amount');  // Using some built-in function: get_sum()
    frm.refresh_field('total');  // Using frm here to refresh the parent field 'total'.
}

function calculate_parcel_content_amount_and_parcel_total(frm, cdt, cdn) {
    // Calculates the 'amount' field on Parcel Content Doctype(Child) and 'total' field on Parcel Doctype(Parent)
    let row = locals[cdt][cdn]; // Getting Child Row

    row.amount = row.qty * row.rate;  // Calculating amount

    refresh_field('amount', cdn, 'content'); // Show change on 'amount' field. Without triggering any event.

    calculate_parcel_total(frm); // Calculate the parent 'total' field and trigger events.
}

frappe.ui.form.on('Parcel', {

    setup: function(frm) {
        // This allow us to send non-obtrusive messages from the backend: FIXME: is another way? Refactor.
        // https://frappeframework.com/docs/user/en/api/dialog#frappeshow_alert its not available for Python API.
        frappe.realtime.on('display_alert', (msg) => {
            frappe.show_alert({message: msg, indicator: 'yellow'}, 5);
        }); // TODO: Validate this action when the list page is open!

        // TODO: this must be running from core frappe code. Some glitch make us hardcoded the realtime handler here.
        frappe.realtime.on("doc_update", () => { // See: https://github.com/frappe/frappe/pull/11137
            frm.reload_doc(); // Reload form UI data from db.
        });
    },

    onload: function(frm) {
        // Setting Currency Labels
        frm.set_currency_labels(['total'], 'USD');
        frm.set_currency_labels(['rate', 'amount'], 'USD', 'content');
    },

    refresh: function(frm) {

        if (frm.is_new()) {
            return; // No Messages or etc..
        }

        // This custom button should live as an Action in the Doctype(Doctype Actions) -> inside actions.py
        frm.add_custom_button(__('Visit carrier detail page'), () => {
            frappe.db.get_value('Parcel Carrier', {'name': frm.doc.carrier}, 'carrier_detail_page_url', (r) => {
                if (r.carrier_detail_page_url) {
                    window.open(r.carrier_detail_page_url + frm.doc.tracking_number, '_blank');
                    return; // Exiting the callback
                }

                // The carrier doesnt have a specific detail page. we must use the default on system
                frappe.db.get_single_value('Parcel Settings', 'default_carrier_detail_page_url')
                    .then(url => {
                        window.open(url + frm.doc.tracking_number, '_blank');
                    });

            }, 'Parcel Settings');
        });

        // TODO: Improve this messages. must come from backend!!
        switch (frm.doc.status) {
            case 'Awaiting Receipt':
                frm.dashboard.set_headline('Paquete aun no se entrega en almacen.', 'blue');
            break;
            case 'Awaiting Confirmation':
                frm.dashboard.set_headline('Paquete fue entregado segun el carrier, esperando confirmacion del almacen.', 'yellow');
            break;
            case 'Awaiting Dispatch':
                frm.dashboard.set_headline('Paquete fue recepcionado, esperando proximo despacho de mercaderia.', 'yellow');
            break;
            // TODO: Package has an issue?
        }
    },

    // TODO: Tracking Validator from backend, and Carrier Select helper.
});

frappe.ui.form.on('Parcel Content', {
    // Children Doctype of Parcel

    content_remove(frm) {
        calculate_parcel_total(frm);
    },

    rate: function(frm, cdt, cdn) {
        calculate_parcel_content_amount_and_parcel_total(frm, cdt, cdn);
    },

    qty: function(frm, cdt, cdn) {
        calculate_parcel_content_amount_and_parcel_total(frm, cdt, cdn);
    },

});
