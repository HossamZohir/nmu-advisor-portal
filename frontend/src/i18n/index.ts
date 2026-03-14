export const translations = {
  en: {
    // Login
    academic_advisor_portal: 'Academic Advisor Portal',
    welcome_back: 'Welcome back!',
    email: 'Email address',
    password: 'Password',
    sign_in: 'Log in',
    signing_in: 'Signing in...',
    invalid_credentials: 'Invalid email or password',

    // Nav
    portal_name: 'NMU Advisor Portal',
    faculty: 'Faculty of Engineering',
    users: 'Users',
    reports: 'Reports',
    semesters: 'Semesters',
    logout: 'Logout',
    locked: 'Locked',

    // Advisor Dashboard
    my_students: 'My Students',
    my_students_desc: 'Manage course registrations for your assigned students',
    total_students: 'Total Students',
    submitted: 'Submitted',
    in_progress: 'In Progress',
    not_started: 'Not Started',
    search_students: 'Search by name or student ID...',
    gpa: 'GPA',
    sis: 'SIS',
    paid: 'Paid',

    // Admin Dashboard
    advisors_dashboard: 'Advisors Tracking Dashboard',
    advisors_dashboard_desc: 'Monitor registration progress across all advisors',
    import_students: 'Import Students',
    all_advisors: 'All Advisors',
    registered: 'Registered',
    sis_done: 'SIS Done',
    all_students: 'All Students',
    student: 'Student',
    advisor: 'Advisor',
    registered_courses: 'Registered Courses',
    hours: 'Hours',
    status: 'Status',
    assign_students: 'Assign Students',
    choose_advisor: 'Choose an advisor...',
    select_advisor: 'Select Advisor',
    cancel: 'Cancel',
    assign: 'Assign',
    assigning: 'Assigning...',
    search_student: 'Search student...',

    // Registration
    available_courses: 'Available Courses',
    selected_courses: 'Selected Courses',
    student_info: 'Student Info',
    level: 'Level',
    max_credits: 'Max Credits',
    credit_hours_label: 'Credit Hours',
    status_flags: 'Status Flags',
    registered_in_sis: 'Registered in SIS',
    invoice_paid: 'Invoice Paid',
    submit_registration: 'Submit Registration',
    submitting: 'Submitting...',
    registration_submitted: '✅ Registration Submitted',
    registration_locked: '🔒 Registration Locked',
    back: 'Back',
    search_courses: 'Search courses...',
    no_courses: 'No available courses for this semester',
    no_courses_selected: 'No courses selected yet',
    print_form: 'Print Registration Form',
    courses_selected: 'courses selected',
    courses_available: 'courses available this semester',
  },
  ar: {
    // Login
    academic_advisor_portal: 'بوابة المرشد الأكاديمي',
    welcome_back: 'مرحباً بعودتك!',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    sign_in: 'تسجيل الدخول',
    signing_in: 'جار تسجيل الدخول...',
    invalid_credentials: 'بريد إلكتروني أو كلمة مرور غير صحيحة',

    // Nav
    portal_name: 'بوابة المرشد الأكاديمي',
    faculty: 'كلية الهندسة',
    users: 'المستخدمون',
    reports: 'التقارير',
    semesters: 'الفصول الدراسية',
    logout: 'تسجيل الخروج',
    locked: 'مقفل',

    // Advisor Dashboard
    my_students: 'طلابي',
    my_students_desc: 'إدارة تسجيل المقررات للطلاب المسندين إليك',
    total_students: 'إجمالي الطلاب',
    submitted: 'تم التسجيل',
    in_progress: 'قيد التسجيل',
    not_started: 'لم يبدأ',
    search_students: 'بحث بالاسم أو الرقم الأكاديمي...',
    gpa: 'المعدل',
    sis: 'SIS',
    paid: 'السداد',

    // Admin Dashboard
    advisors_dashboard: 'لوحة متابعة المرشدين',
    advisors_dashboard_desc: 'متابعة تقدم التسجيل عبر جميع المرشدين',
    import_students: 'استيراد الطلاب',
    all_advisors: 'جميع المرشدين',
    registered: 'مسجّل',
    sis_done: 'تم SIS',
    all_students: 'جميع الطلاب',
    student: 'الطالب',
    advisor: 'المرشد',
    registered_courses: 'المواد المسجلة',
    hours: 'الساعات',
    status: 'الحالة',
    assign_students: 'تعيين الطلاب',
    choose_advisor: 'اختر مرشداً...',
    select_advisor: 'اختر المرشد',
    cancel: 'إلغاء',
    assign: 'تعيين',
    assigning: 'جار التعيين...',
    search_student: 'بحث عن طالب...',

    // Registration
    available_courses: 'المواد المتاحة',
    selected_courses: 'المواد المختارة',
    student_info: 'بيانات الطالب',
    level: 'المستوى',
    max_credits: 'الحد الأقصى للساعات',
    credit_hours_label: 'الساعات المعتمدة',
    status_flags: 'حالة التسجيل',
    registered_in_sis: 'مسجّل في النظام',
    invoice_paid: 'تم السداد',
    submit_registration: 'تأكيد التسجيل',
    submitting: 'جار التأكيد...',
    registration_submitted: '✅ تم تأكيد التسجيل',
    registration_locked: '🔒 التسجيل مقفل',
    back: 'رجوع',
    search_courses: 'بحث عن مادة...',
    no_courses: 'لا توجد مواد متاحة لهذا الفصل',
    no_courses_selected: 'لم يتم اختيار أي مواد',
    print_form: 'طباعة استمارة التسجيل',
    courses_selected: 'مواد مختارة',
    courses_available: 'مادة متاحة هذا الفصل',
  }
}

export type Lang = 'en' | 'ar'

export function getLang(): Lang {
  return (localStorage.getItem('language') || 'en') as Lang
}

export function setLang(lang: Lang) {
  localStorage.setItem('language', lang)
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

export function t(key: string): string {
  const lang = getLang()
  return (translations[lang] as any)?.[key] || (translations.en as any)?.[key] || key
}

const i18n = {
  language: getLang(),
  t,
  changeLanguage: (lang: string) => setLang(lang as Lang)
}

export default i18n