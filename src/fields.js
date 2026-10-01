/**
 * Single source of truth for the form fields.
 * - label:   text shown on the web form (used to find the input)
 * - header:  column name in the Excel file
 * - reflect: Angular attribute used as a fallback locator
 */
const FIELDS = [
  { key: 'firstName', label: 'First Name', header: 'First Name', reflect: 'labelFirstName' },
  { key: 'lastName', label: 'Last Name', header: 'Last Name', reflect: 'labelLastName' },
  { key: 'companyName', label: 'Company Name', header: 'Company Name', reflect: 'labelCompanyName' },
  { key: 'role', label: 'Role in Company', header: 'Role in Company', reflect: 'labelRole' },
  { key: 'address', label: 'Address', header: 'Address', reflect: 'labelAddress' },
  { key: 'email', label: 'Email', header: 'Email', reflect: 'labelEmail' },
  { key: 'phone', label: 'Phone Number', header: 'Phone Number', reflect: 'labelPhone' },
];

module.exports = { FIELDS };
