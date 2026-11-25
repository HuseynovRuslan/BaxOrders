"""
check_history.history_report on figures built by hand, in import_workbook's shape — no Excel and no openpyxl needed:

    python -I -m unittest discover -s scripts -p "test_check_history.py"     (from prototypes/executive)
"""
import unittest

from check_history import history_report, parse_years


def line(year, month, site, amount, kind='monthly', supplier='Cleanfix'):
    return dict(id=f'l-{year}-{month}-{site}-{kind}', type=kind, orderId='', year=year, month=month, siteId=site, productId='p1',
                qty=1, unit='ədəd', price=amount, amount=amount, supplier=supplier)


def figures(lines, sites, roots=('Təmizlik',)):
    return dict(
        meta={}, lines=lines, orders=[], outsideRequests=[], products=[],
        sites=[dict(id=site.lower(), name=site, kind='') for site in sites],
        categories=[dict(id=root.lower(), name=root, level=1, parentId=None, path=[root.lower()]) for root in roots],
    )


CURRENT = figures([line(2025, month, 'puskin', 100) for month in range(1, 13)] + [line(2026, 1, 'puskin', 120)], ['Puskin', 'Parlament'])


class HistoryReport(unittest.TestCase):
    def test_a_whole_year_of_known_objects_passes_with_its_totals(self):
        history = figures([line(2023, month, 'puskin', 80) for month in range(1, 13)], ['Puskin'])
        report = history_report(history, CURRENT, parse_years('2020-2024'))
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['warnings'], [])
        self.assertEqual(report['coverage'][2023]['missingMonths'], [])
        self.assertEqual(report['totals']['2023']['2023-05'], {'monthly': 80.0, 'outside': 0.0})
        # Years the file does not have are said to have no data — not zero.
        self.assertTrue(any(note.startswith('2020: faylda sətir yoxdur') and '0 ₼ deyil' in note for note in report['notes']))
        self.assertTrue(any(note.startswith('Təsdiq:') for note in report['notes']))
        # Objects of the site the file does not mention are named, not invented.
        self.assertTrue(any('Parlament' in note for note in report['notes']))

    def test_a_year_outside_the_declared_ones_or_already_on_the_site_is_refused(self):
        history = figures([line(2024, 1, 'puskin', 80), line(2025, 1, 'puskin', 100)], ['Puskin'])
        report = history_report(history, CURRENT, parse_years('2020-2024'))
        self.assertEqual(len(report['errors']), 2)
        self.assertIn('2025: 1 sətir', report['errors'][0])
        self.assertIn('2025 ili saytın rəqəmlərində artıq var', report['errors'][1])

    def test_missing_months_outside_only_months_and_unknown_names_are_named(self):
        history = figures(
            [line(2022, month, 'puskin', 80) for month in (1, 2, 4)] + [line(2022, 3, 'puskin', 15, 'outside'), line(2022, 2, 'puşkin-parki', 5)],
            ['Puskin', 'Puşkin parkı'], roots=('Təmizlik', 'Bağ'),
        )
        report = history_report(history, CURRENT, [2022])
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['coverage'][2022]['monthlyMonths'], [1, 2, 4])
        self.assertEqual(report['coverage'][2022]['outsideOnlyMonths'], [3])
        self.assertEqual(report['objects']['newToSite'], ['Puşkin parkı'])
        warnings = ' '.join(report['warnings'])
        self.assertIn('Mart aylarında yalnız aylıqdan kənar', warnings)
        self.assertIn('Puşkin parkı', warnings)
        self.assertIn('heç nə oxşar ada bağlanmır', warnings)
        self.assertIn('Bağ', warnings)
        self.assertTrue(any('Mart, May, İyun' in note for note in report['notes']))

    def test_a_year_with_outside_orders_only_is_flagged(self):
        report = history_report(figures([line(2021, 6, 'puskin', 30, 'outside')], ['Puskin']), CURRENT, [2021])
        self.assertTrue(any(warning.startswith('2021: aylıq sifariş yoxdur') for warning in report['warnings']))

    def test_without_current_figures_only_the_file_itself_is_checked(self):
        report = history_report(figures([line(2020, 1, 'x', 1)], ['X']), None, [2020])
        self.assertEqual(report['errors'], [])
        self.assertEqual(report['currentYears'], [])
        self.assertEqual(report['objects']['newToSite'], ['X'])
        self.assertFalse(any('obyekt adı' in warning for warning in report['warnings']))

    def test_years_are_read_as_a_range_or_a_list(self):
        self.assertEqual(parse_years('2020-2024'), [2020, 2021, 2022, 2023, 2024])
        self.assertEqual(parse_years('2023, 2021'), [2021, 2023])
        with self.assertRaises(ValueError):
            parse_years(' ')


if __name__ == '__main__':
    unittest.main()
