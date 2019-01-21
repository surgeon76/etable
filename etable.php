<?php
require_once ($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/include/prolog_before.php");

if (session_status() == PHP_SESSION_NONE)
	session_start();

function CanEdit()
{
	//if (isset($_SESSION["scheduleCanEdit"]))
	//	return $_SESSION["scheduleCanEdit"];
	
	global $USER;

	$groups = $USER->GetUserGroupArray();
	$canEdit = false;
	$setEdit = [1, 8, 9, 11];
	foreach ($groups as $groupID)
	{
		if (in_array($groupID, $setEdit, false))
		{
			$canEdit = true;
			break;
		}
	}

	//$_SESSION["scheduleCanEdit"] = $canEdit;
	return $canEdit;
}

$request = $_GET["request"];
$response = [];

function GetConditionPairs($str)
{
	$ret = [];
	
	$pairs = explode(',', $str);
	if ($pairs)
	{
		foreach($pairs as $pair)
		{
			$condPair = explode('=', $pair);
			if ($condPair && count($condPair) == 2)
			{
				$condKey = trim($condPair[0]);
				$condVal = trim($condPair[1]);
				$ret[$condKey] = $condVal;
			}
		}
	}
	
	return $ret;
}

function GetConditionString($str)
{
	$cond = "";
	$pairs = explode(',', $str);
	if ($pairs)
		$cond = implode(" and ", $pairs);
	return $cond;
}

if ($request == 'canEdit')
{
	$response = CanEdit();
}
else if ($request == 'load')
{
	try
	{
		$conn = \Bitrix\Main\Application::getConnection();
		
		$sort = strlen($_GET["sort"]) > 0 ? ("order by " . $_GET["sort"]) : "";
		$cond = strlen($_GET["condition"]) > 0 ? ("where " . GetConditionString($_GET["condition"])) : "";
		
		$sql = sprintf("select * from %s %s %s", $_GET["table"], $cond, $sort);
		$recordset = $conn->query($sql);
		$response = $recordset->fetchAll();
	}
	catch(Exception $e)
	{
		$response = [];
	}
}
else if ($request == 'add')
{
	if (!CanEdit())
	{
		echo \Bitrix\Main\Web\Json::encode(["error" => "permissions"]);
		die();
	}

	try
	{
		$conn = \Bitrix\Main\Application::getConnection();
		
		$cond = strlen($_GET["condition"]) > 0 ? $_GET["condition"] : "";
		$condPairs = GetConditionPairs($cond);
		$condKeys = implode(",", array_keys($condPairs));
		if (strlen($condKeys) > 0)
			$condKeys = "(" . $condKeys . ")";
		$condVals = implode(",", $condPairs);
		
		$sql = sprintf("insert into %s %s values (%s)", $_GET["table"], $condKeys, $condVals);
		$conn->queryExecute($sql);
		$sql = "select LAST_INSERT_ID()";
		$response = $conn->queryScalar($sql);
	}
	catch(Exception $e)
	{
		$response = false;
	}
}
else if ($request == 'save')
{
	if (!CanEdit())
	{
		echo \Bitrix\Main\Web\Json::encode(["error" => "permissions"]);
		die();
	}
	
	try
	{
		$conn = \Bitrix\Main\Application::getConnection();
		$val = iconv("utf-8", "windows-1251", $_GET["value"]);
		$sqlHelper = $conn->getSqlHelper();
		$sql = sprintf("update %s set %s='%s' where %s=%d", $_GET["table"], $_GET["name"], $sqlHelper->forSql($val), $_GET["idname"], $_GET["id"]);
		$conn->queryExecute($sql);
		$response = true;
	}
	catch(Exception $e)
	{
		$response = false;
	}
}
else if ($request == 'delete')
{
	if (!CanEdit())
	{
		echo \Bitrix\Main\Web\Json::encode(["error" => "permissions"]);
		die();
	}
	
	try
	{
		$conn = \Bitrix\Main\Application::getConnection();
		$sql = sprintf("delete from %s where %s=%d", $_GET["table"], $_GET["idname"], $_GET["id"]);
		$conn->queryExecute($sql);
		$response = true;
	}
	catch(Exception $e)
	{
		$response = false;
	}
}

if ($response === false || is_null($response))
	echo \Bitrix\Main\Web\Json::encode(["error" => "error"]);
else
	echo \Bitrix\Main\Web\Json::encode($response);
?>