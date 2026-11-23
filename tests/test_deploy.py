"""Transport integration tests: real Git archives, fake SSH boundary, no network."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        source = Path(__file__).resolve().parents[1]
        for relative in ('scripts/deploy.sh', 'deploy/production.conf', 'deploy/production.pub', 'deploy/production_known_hosts'):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / relative, target)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        self.git('add', '.')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture')
        self.revision = self.git('rev-parse', 'HEAD').strip()
        self.bin = self.root / 'fake-bin'
        self.bin.mkdir()
        stub = self.bin / 'boundary.py'
        # Like the retired deploy-ci fixture, validate explicit host/identity
        # options at the process boundary and record calls. No real SSH occurs.
        stub.write_text('''#!/usr/bin/env python3
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
mode = (root / 'mode').read_text()
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
with (root / 'calls').open('a') as stream:
    stream.write(json.dumps([name, args]) + '\\n')
identity = 'SHA256:ENOOD3VjgiKU9T1VWaJdIwnoeraF56zYLwvpcoQYqbU'
host = 'SHA256:BC+iVb0Dg/eVNJX1OFB5psoK5dSRMMaA5WREYdlhshM'
if name == 'ssh-keygen':
    fingerprint = host if args[1].endswith('known_hosts') else identity
    print('256 ' + ('SHA256:wrong' if mode == 'wrong-host' and fingerprint == host else fingerprint) + ' fixture')
elif name == 'ssh-add':
    print('256 ' + ('SHA256:missing' if mode == 'missing-key' else identity) + ' fixture')
else:
    assert 'IdentitiesOnly=yes' in args and 'StrictHostKeyChecking=yes' in args
    assert 'HostKeyAlgorithms=ssh-ed25519' in args and 'ForwardAgent=no' in args
    assert args[args.index('-i') + 1] == str(root / 'deploy/production.pub')
    assert any('UserKnownHostsFile=' + str(root / 'deploy/production_known_hosts') == arg for arg in args)
    assert any(arg.startswith('root@77.68.112.97') for arg in args)
    if name == 'scp' and mode == 'fail-upload': sys.exit(42)
    if name == 'ssh' and 'deploy-apply.sh' in args[-1]:
        if mode == 'fail-apply':
            print('fixture remote apply failure'); sys.exit(43)
        if mode != 'missing-receipt': print('APPLIED ' + (root / 'revision').read_text())
''')
        stub.chmod(0o755)
        for command in ('ssh', 'scp', 'ssh-keygen', 'ssh-add'):
            (self.bin / command).symlink_to(stub.name)
        (self.root / 'revision').write_text(self.revision)

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True)

    def run_deploy(self, mode='success', revision=None):
        (self.root / 'mode').write_text(mode)
        result = subprocess.run(['bash', 'scripts/deploy.sh', '--config', 'deploy/production.conf',
                                 '--revision', revision or self.revision], cwd=self.root,
                                env={**os.environ, 'PATH': str(self.bin) + os.pathsep + os.environ['PATH']},
                                capture_output=True, text=True, timeout=10)
        calls = [json.loads(line) for line in (self.root / 'calls').read_text().splitlines()] if (self.root / 'calls').exists() else []
        self.assertFalse(list((self.root / 'tmp').glob('deploy.*')))
        return result, calls

    def test_success_uses_pinned_identity_and_requires_revision_receipt(self):
        result, calls = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual([name for name, _ in calls if name in ('ssh', 'scp')], ['ssh', 'scp', 'ssh'])

    def test_untrusted_host_or_missing_identity_never_connects(self):
        for mode in ('wrong-host', 'missing-key'):
            with self.subTest(mode=mode):
                (self.root / 'calls').unlink(missing_ok=True)
                result, calls = self.run_deploy(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(name in ('ssh', 'scp') for name, _ in calls))
                log = Path(result.stdout.strip()).read_text()
                self.assertIn('Production host key fingerprint mismatch' if mode == 'wrong-host' else
                              'Required TeamCity deployment identity is not loaded', log)
                event = json.loads(log.splitlines()[-1])
                self.assertEqual(event['severity'], 'ERROR')
                self.assertIn('timestamp', event)

    def test_upload_or_apply_failure_and_missing_receipt_cannot_succeed(self):
        for mode in ('fail-upload', 'fail-apply', 'missing-receipt'):
            with self.subTest(mode=mode):
                (self.root / 'calls').unlink(missing_ok=True)
                result, calls = self.run_deploy(mode)
                self.assertNotEqual(result.returncode, 0)
                if mode == 'fail-upload':
                    self.assertEqual([name for name, _ in calls if name in ('ssh', 'scp')], ['ssh', 'scp'])
                if mode == 'fail-apply':
                    self.assertIn('fixture remote apply failure', Path(result.stdout.strip()).read_text())

    def test_wrong_revision_and_dirty_tracked_source_never_connect(self):
        result, calls = self.run_deploy(revision='f' * 40)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(calls)
        (self.root / 'scripts/deploy.sh').write_text((self.root / 'scripts/deploy.sh').read_text() + '\n# dirty\n')
        result, calls = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(calls)


if __name__ == '__main__':
    unittest.main()
