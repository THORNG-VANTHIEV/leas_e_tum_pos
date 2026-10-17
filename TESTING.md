# ការតេស្តប្រព័ន្ធ Leashal Etum POS

ឯកសារនេះប្រាប់ពីរបៀបតេស្តតាមផ្នែក (module) ដើម្បីឱ្យរហ័ស និងចំគោលដៅ៖ កែផ្នែកណា តេស្តផ្នែកនោះ ហើយ run ទាំងអស់មុនពេល commit។

## 1. Command តាមផ្នែក

| ផ្នែក | Command | អ្វីដែលត្រូវបានតេស្ត | Run ពេលកែ |
|---|---|---|---|
| **POS & វិក្កយបត្រ** | `composer test:pos` | គិតប្រាក់, ផ្អាកតុ, Void, foodpanda/Grab, សិទ្ធិមើលវិក្កយបត្រ, ព្រីនជាបាច់ | `app/Features/Documents`, `pages/documents` |
| **ផ្ទះបាយ** | `composer test:kitchen` | បុងចុងភៅ (មុខថ្មី/បោះបង់), KDS | `KitchenTicketIssuer`, `app/Features/Kds`, `pages/kds`, `pages/kitchen-tickets` |
| **តុ** | `composer test:floor` | បង្កើត/កែ/លុបតុ, តុមានភ្ញៀវ | `app/Features/Floor`, `pages/floor` |
| **មុខទំនិញ** | `composer test:catalog` | មុខទំនិញ, ឯកតា, ប្រភេទ | `app/Features/Catalog`, `pages/catalog` |
| **ការទិញចូល** | `composer test:purchases` | ការទិញចូល, ការកែ, អ្នកផ្គត់ផ្គង់ | `app/Features/Purchases`, `pages/purchases` |
| **ចំណាយ** | `composer test:expenses` | ចំណាយ, ការកែ/លុប, អត្រាប្តូរប្រាក់, ថតបេឡា | `app/Features/Expenses`, `pages/expenses` |
| **អតិថិជន** | `composer test:customers` | អតិថិជន, ពិន្ទុសន្សំ | `app/Features/Customers`, `pages/customers` |
| **របាយការណ៍** | `composer test:reports` | ចំណូល (ដក Void), cashier ឃើញតែការលក់ខ្លួន, បិទវគ្គ | `app/Features/Reports`, `app/Features/Periods` |
| **បុគ្គលិក & សិទ្ធិ** | `composer test:users` | Login, បុគ្គលិក, សាខា, សិទ្ធិ Admin/Supervisor/Cashier, Approval, Audit | `SettingsController`, `routes/web.php`, `RoleGuard` |
| **Backup** | `composer test:backups` | Backup គ្រប់ 22 តារាង, Restore, Backup ប្រចាំថ្ងៃ | `app/Features/Backups`, `BackupDailyCommand` |
| **គណនាលុយ** | `composer test:unit` | Money, DocumentCalculator | `app/Support/Money`, `DocumentCalculator` |
| **បើកគ្រប់ទំព័រ** | `composer test:smoke` | បើកទំព័រទាំង 27 ជា admin / supervisor / cashier ជាមួយទិន្នន័យពិត | ក្រោយកែ layout, routes, shared props ឬ CSS ធំៗ |
| **TypeScript** | `composer test:types` | កំហុស type ក្នុង frontend | រាល់ពេលកែ `.tsx` / `.ts` |
| **ទាំងអស់** | `composer check` | TypeScript + test ទាំងអស់ | **មុនពេល commit / push** |

តេស្តតែ test មួយ៖ `php artisan test --filter=test_add_on_round_only_tickets_new_and_cancelled_dishes`

## 2. លំហូរការងារ

1. **ពេលកំពុងកែកូដ** → run តែផ្នែកដែលកែ (ឧ. `composer test:kitchen`) ដែលចំណាយពេលតែប៉ុន្មានវិនាទី។
2. **ក្រោយកែ UI / layout / routes** → `composer test:smoke` រួចពិនិត្យដោយដៃតាមផ្នែកទី 3។
3. **មុនពេល commit** → `composer check` ត្រូវតែឆ្លងកាត់ទាំងអស់ (ពណ៌បៃតង)។
4. **រកឃើញ bug** → សរសេរ test ដែលបរាជ័យសិន ក្នុង folder នៃផ្នែកនោះ (`tests/Feature/<ផ្នែក>/`) រួចទើបកែកូដ។

គណនីសាកល្បងពី seeder៖ `admin`, `supervisor1`, `cashier1` (មើល password ក្នុង `database/seeders/DatabaseSeeder.php`)។

## 3. បញ្ជីតេស្តដោយដៃ (test ស្វ័យប្រវត្តិមិនអាចពិនិត្យបាន)

### POS & ការព្រីន (printer USB)
- [ ] ផ្អាកតុ → **បុងចុងភៅ** ចេញភ្លាម ហើយអក្សរខ្មែរត្រឹមត្រូវ (ស្រៈ/ជើង មិនបាក់)
- [ ] កម្មង់បន្ថែមលើតុដដែល → បុងទីពីរមានស្លាក **ADD-ON** និងមាន**តែមុខថ្មី**
- [ ] ដកមុខម្ហូបចេញ → បុងបង្ហាញ **✕ បោះបង់**
- [ ] គិតប្រាក់ខ្ចប់ → បុងចុងភៅ រួចវិក្កយបត្រ 80mm ចេញតាមលំដាប់
- [ ] គិតប្រាក់តុដែលបានផ្អាក → ចេញតែវិក្កយបត្រ (គ្មានបុងស្ទួន)
- [ ] Chrome បើកជាមួយ `--kiosk-printing` → ព្រីនដោយមិនលោតផ្ទាំងសួរ
- [ ] foodpanda / Grab → ប្រអប់ឈ្មោះ app និង ORDER # ដិតនៅលើវិក្កយបត្រ
- [ ] ម៉ោងលើវិក្កយបត្រ = ម៉ោងនាឡិកាកម្ពុជា

### តុ & ផ្ទះបាយ
- [ ] តុដែលផ្អាក → ទំព័រ Floor បង្ហាញ **មានភ្ញៀវ**, សរុបប្រាក់ និងនាទី
- [ ] ចុច **បើកតុ / គិតលុយ** → POS បើកជាមួយមុខម្ហូបចាស់ (មិនមែនកន្ត្រកទទេ)
- [ ] KDS បង្ហាញតុដែលផ្អាកភ្លាមៗ (មុនពេលបង់ប្រាក់)

### សិទ្ធិ (ចូលជា cashier1)
- [ ] មិនឃើញប៊ូតុងកែតម្លៃ, បន្ថែមមុខម្ហូប, កែពិន្ទុ, បន្ថែម/កែ/លុបតុ, កែ/លុបចំណាយ, Void
- [ ] Reports បង្ហាញតែការលក់របស់ខ្លួន

### UI (Light & Dark mode)
- [ ] ប្តូរ Light/Dark នៅទំព័រដែលបានកែ → គ្មានផ្ទៃខ្មៅលើអក្សរខ្មៅ គ្មាន hover ខ្មៅ
- [ ] ទទឹងអេក្រង់តូច (tablet) → តារាង និង modal មិនដាច់

### Backup (ម្តងក្នុងមួយខែ)
- [ ] `php artisan backup:daily` → មាន file ថ្មីក្នុង `storage/app/backups/daily/`
- [ ] ចម្លង backup ចុងក្រោយទៅ USB / Google Drive
- [ ] សាក Restore លើម៉ាស៊ីនសាកល្បង (មិនមែនម៉ាស៊ីនលក់ពិត)

## 4. ការសរសេរ test ថ្មី

- ដាក់ file ក្នុង folder នៃផ្នែក៖ `tests/Feature/<Kds|Floor|Documents|...>/<ឈ្មោះ>Test.php`
- បង្កើតដោយ `php artisan make:test --phpunit <Folder>/<ឈ្មោះ>Test`
- ឈ្មោះ test ប្រាប់ពីលទ្ធផល និងលក្ខខណ្ឌ៖ `test_cashier_cannot_change_product_price`
- ប្រើ `$this->seed()` និងគណនី `admin` / `supervisor1` / `cashier1` ដូច test ផ្សេងៗ
- បើបង្កើត folder ផ្នែកថ្មី សូមបន្ថែម script `test:<ផ្នែក>` ក្នុង `composer.json` និងជួរមួយក្នុងតារាងខាងលើ
