// Shared constant lists used across the app (pickers, option lists)
// Keep these centralized so multiple screens/components can reuse them.

export const DISTRICTS = ['Wakiso', 'Mbale', 'Luwero', 'Mukono', 'Kampala', 'Masaka'];

export const SUB_COUNTIES = [
  'Bussi Sub-County',
  'Kakiri Sub-County',
  'Kakiri Town Council',
  'Kasanje Sub-County',
  'Katabi Town Council',
  'Masuliita Sub-County',
  'Masulita Town Council',
  'Mende Sub-County',
  'Namayumba Sub-County',
  'Namayumba Town Council',
  'Kajjansi Town Council',
  'Wakiso Sub-County',
  'Wakiso Town Council',
  'Wakiso — Division A',
  'Wakiso — Division B',
  'Bweyogerere Division',
  'Kira Division',
  'Namugongo Division',
  'Kasangati Town Council',
  'Bunamwaya Division',
  'Masajja Division',
  'Ndejje Division',
  'Busukuma Division',
  'Gombe Division',
  'Nabweru Division',
  'Nansana Division',
  'Kyengera Town Council'
];

export const PARISHES_BY_SUB_COUNTY = {
  'Bussi Sub-County': ['Balabala', 'Bussi', 'Gulwe', 'Tebankiza', 'Zzinga'],
  'Kakiri Sub-County': ['Kikandwa', 'Luwunga', 'Kamuli', 'Sentema', 'Lubbe', 'Buwanuka', 'Magoggo', 'Nampunge'],
  'Kakiri Town Council (parishes / wards)': ['Bukalango', 'Busujja', 'Kakiri', 'Kikubampanga', 'Lugeye', 'Nakyelongoosa'],
  'Kasanje Sub-County': ['Bulumbu', 'Jjungo', 'Kasanje', 'Mako', 'Sokolo', 'Ssazi', 'Zziba'],
  'Katabi Town Council': ['Kabale', 'Kisubi', 'Kitala', 'Nalugala', 'Nkumba'],
  'Masuliita Sub-County': ['Bbale Mukwenda', 'Kyengeza', 'Lwemwedde', 'Manze', 'Nakikungube', 'Tumbaali'],
  'Masulita Town Council': ['Kabale', 'Kanzize', 'Katikamu', 'Lugungudde', 'Masulita'],
  'Mende Sub-County': ['Bakka', 'Banda', 'Kaliiti', 'Mende', 'Namusera'],
  'Namayumba Sub-County': ['Bbembe', 'Bukondo', 'Kanziro', 'Kitayita', 'Kyasa', 'Nakedde'],
  'Namayumba Town Council': ['Kyampisi', 'Kyanuuna', 'Luguzi', 'Luttisi'],
  'Kajjansi Town Council': ['Bulwanyi', 'Bweya', 'Kitende', 'Nakawuka', 'Namulanda', 'Nankonge', 'Ngongolo', 'Nkungulutale', 'Nsaggu', 'Ssisa', 'Wamala'],
  'Wakiso Sub-County': ['Bukasa', 'Buloba', 'Kyebando', 'Lukwanga', 'Nakabugo', 'Ssumbwe'],
  'Wakiso Town Council': ['Gombe', 'Kasengejje', 'Kavumba', 'Kisimbiri', 'Mpunga', 'Naluvule', 'Namusera'],
  'Wakiso — Division A (Wakiso Town Division A)': ['Central', 'Katabi'],
  'Wakiso — Division B (Wakiso Town Division B)': ['Kigungu', 'Kiwafu'],
  'Bweyogerere Division': ['Bweyogerere'],
  'Kira Division': ['Kimwanyi', 'Kira'],
  'Namugongo Division': ['Kireka', 'Kyaliwajjala'],
  'Kasangati Town Council': ['Bulamu', 'Gayaza', 'Kabubbu', 'Katadde', 'Kiteezi', 'Masooli', 'Nangabo', 'Wampeewo', 'Wattuba'],
  'Bunamwaya Division': ['Bunamwaya', 'Mutundwe'],
  'Masajja Division': ['Busabala', 'Masajja', 'Namasuba'],
  'Ndejje Division': ['Mutungo', 'Ndejje', 'Seguku'],
  'Busukuma Division': ['Busukuma', 'Guluddene'],
  'Gombe Division': ['Buwambo', 'Gombe', 'Kavule', 'Kiryamuli', 'Matugga', 'Migadde', 'Mwereerwe', 'Nasse', 'Ssanga', 'Tikalu', 'Wambale'],
  'Nabweru Division': ['Kawanda', 'Maganjo', 'Nakyesanja', 'Wamala'],
  'Nansana Division': ['Ochieng', 'Kazo', 'Nabweru North', 'Nabweru South', 'Nansana East', 'Nansana West'],
  'Kyengera Town Council': ['Buddo', 'Kasenge', 'Katereke', 'Kikajjo', 'Kitemu-Kisozi', 'Kyengera Town Board', 'Maya', 'Nabbingo', 'Nanziga', 'Nsangi']
};
export const GENDERS = ['Male', 'Female'];
export const COFFEE_VARIETIES = ['Arabica', 'Robusta', 'Liberica'];
export const LAND_OWNERSHIP = ['leased', 'communal', 'owned'];
export const SEEDLING_SOURCES = ['nursery', 'own_cooperative', 'bought'];
export const IRRIGATION_OPTIONS = ['none', 'river', 'sprinkler', 'drip'];
export const FERTILIZERS = ['Organic', 'Inorganic', 'Mixed'];
export const FERTILIZER_ORGANIC = ['Bird Droppings', 'Rabbit Urine', 'Compost', 'Manure'];
export const FERTILIZER_INORGANIC = ['NPK', 'Urea', 'DAP', 'CAN'];
export const PESTICIDES = ['None', 'Striker', 'Fungicide', 'Copper-based', 'Neem oil', 'Biological control'];
export const COFFEE_TYPES = ['Arabica', 'Robusta', 'Liberica'];
export const YES_NO_OPTIONS = ['Yes', 'No'];
export const SPACING_OPTIONS = ['3 metres by 3 metres', '2.4 metres by 2.4 metres', '2 metres by 1 metres'];
export const STANDARD_PRACTICES = [
  'Inter-cropping', 'Pruning', 'Mulching', 'Stumping', 'Agro-forestry', 'Fertilizing', 'Pest control',
  'Stamping', 'Spot Weeding', 'Desuckering', 'Slashing', 'Shade management',
];

// Seedling types (Robusta and Arabica varieties)
const ROBUSTA_TYPES = Array.from({ length: 10 }, (_, i) => `KR-${String(i + 1).padStart(2, '0')}`);
const ARABICA_TYPES = Array.from({ length: 5 }, (_, i) => `CWDR-${String(i + 1).padStart(2, '0')}`);
export const SEEDLING_TYPES = [...ROBUSTA_TYPES, ...ARABICA_TYPES];

// Optional: other small lists used by aggregation forms
export const GRADES = ['A', 'B', 'C', 'D'];
export const CHERRY_COLORS = ['Red', 'Yellow', 'Green'];
export const STAGES = ['dried', 'fresh_cherry'];
export const LOCATION_ON_DELIVERY_OPTIONS = ['Main Farm', 'Other'];
export const PAID_BY_OPTIONS = ['Me', 'Other Staff Member'];

export const PICKER_MAP = {
    district: DISTRICTS,
    sub_county: SUB_COUNTIES,
    gender: GENDERS,
    coffee_variety: COFFEE_VARIETIES,
    land_ownership: LAND_OWNERSHIP,
    seedling_source: SEEDLING_SOURCES,
    seedling_type: SEEDLING_TYPES,
    irrigation: IRRIGATION_OPTIONS,
    fertilizers: FERTILIZERS,
    fertilizer_organic: FERTILIZER_ORGANIC,
    fertilizer_inorganic: FERTILIZER_INORGANIC,
    pesticides: PESTICIDES,
    coffee_type: COFFEE_TYPES,
    all_your_trees: YES_NO_OPTIONS,
    spacing: SPACING_OPTIONS,
    practices: STANDARD_PRACTICES,
    location_on_delivery: LOCATION_ON_DELIVERY_OPTIONS,
    paid_by_option: PAID_BY_OPTIONS,
};

export default {
    DISTRICTS,
    SUB_COUNTIES,
    COFFEE_VARIETIES,
    LAND_OWNERSHIP,
    SEEDLING_SOURCES,
    IRRIGATION_OPTIONS,
    FERTILIZERS,
    COFFEE_TYPES,
    PICKER_MAP,
    STANDARD_PRACTICES,
    GRADES,
    CHERRY_COLORS,
    STAGES,
};
